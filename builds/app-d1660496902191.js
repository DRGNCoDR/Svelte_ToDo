(function () {
    'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    /* src\app.svelte generated by Svelte v3.35.0 */

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-1gzung5-style";
    	style.textContent = ".svelte-1gzung5.svelte-1gzung5{margin:5px;padding:5px}.main-app.svelte-1gzung5.svelte-1gzung5{border:2px solid black;background:paleturquoise}.todo-list.svelte-1gzung5.svelte-1gzung5{list-style-type:none;display:flex;flex-wrap:wrap}.todo-item.svelte-1gzung5.svelte-1gzung5{border:2px solid red;width:25%;padding:2px;background:aliceblue;border-radius:10px;font-weight:bold}.add-input.svelte-1gzung5.svelte-1gzung5{width:30%}.done.svelte-1gzung5.svelte-1gzung5{border:2px solid green;font-weight:normal}.done.svelte-1gzung5 span.svelte-1gzung5{text-decoration:line-through}";
    	append(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	return child_ctx;
    }

    // (50:8) {#each todoItems as todo (todo.id)}
    function create_each_block(key_1, ctx) {
    	let li;
    	let button;
    	let t1;
    	let input;
    	let input_id_value;
    	let t2;
    	let span;
    	let t3_value = /*todo*/ ctx[9].text + "";
    	let t3;
    	let t4;
    	let li_class_value;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[7](/*todo*/ ctx[9]);
    	}

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[8](/*todo*/ ctx[9]);
    	}

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			li = element("li");
    			button = element("button");
    			button.textContent = "X";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			span = element("span");
    			t3 = text(t3_value);
    			t4 = space();
    			attr(button, "class", "delete-todo svelte-1gzung5");
    			attr(input, "id", input_id_value = /*todo*/ ctx[9].id);
    			attr(input, "type", "checkbox");
    			attr(input, "class", "svelte-1gzung5");
    			attr(span, "class", "svelte-1gzung5");
    			attr(li, "class", li_class_value = "todo-item\n                " + (/*todo*/ ctx[9].checked ? "done" : "") + " svelte-1gzung5");
    			this.first = li;
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			append(li, button);
    			append(li, t1);
    			append(li, input);
    			append(li, t2);
    			append(li, span);
    			append(span, t3);
    			append(li, t4);

    			if (!mounted) {
    				dispose = [
    					listen(button, "click", click_handler),
    					listen(input, "click", click_handler_1)
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*todoItems*/ 2 && input_id_value !== (input_id_value = /*todo*/ ctx[9].id)) {
    				attr(input, "id", input_id_value);
    			}

    			if (dirty & /*todoItems*/ 2 && t3_value !== (t3_value = /*todo*/ ctx[9].text + "")) set_data(t3, t3_value);

    			if (dirty & /*todoItems*/ 2 && li_class_value !== (li_class_value = "todo-item\n                " + (/*todo*/ ctx[9].checked ? "done" : "") + " svelte-1gzung5")) {
    				attr(li, "class", li_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let div;
    	let h1;
    	let t0;
    	let t1;
    	let t2;
    	let form;
    	let input;
    	let t3;
    	let span;
    	let button;
    	let t5;
    	let ul;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let mounted;
    	let dispose;
    	let each_value = /*todoItems*/ ctx[1];
    	const get_key = ctx => /*todo*/ ctx[9].id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	return {
    		c() {
    			div = element("div");
    			h1 = element("h1");
    			t0 = text(/*name*/ ctx[0]);
    			t1 = text("'s ToDos");
    			t2 = space();
    			form = element("form");
    			input = element("input");
    			t3 = space();
    			span = element("span");
    			button = element("button");
    			button.textContent = "Add";
    			t5 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(h1, "class", "svelte-1gzung5");
    			attr(input, "class", "add-input svelte-1gzung5");
    			attr(input, "type", "text");
    			attr(input, "aria-label", "Enter a new todo item");
    			attr(input, "placeholder", "Enter the name of the ToDo");
    			attr(button, "class", "svelte-1gzung5");
    			attr(span, "class", "svelte-1gzung5");
    			attr(form, "class", "svelte-1gzung5");
    			attr(ul, "class", "todo-list svelte-1gzung5");
    			attr(div, "class", "main-app svelte-1gzung5");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h1);
    			append(h1, t0);
    			append(h1, t1);
    			append(div, t2);
    			append(div, form);
    			append(form, input);
    			set_input_value(input, /*newTodo*/ ctx[2]);
    			append(form, t3);
    			append(form, span);
    			append(span, button);
    			append(div, t5);
    			append(div, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen(input, "input", /*input_input_handler*/ ctx[6]),
    					listen(button, "click", /*addTodo*/ ctx[3]),
    					listen(form, "submit", prevent_default(/*addTodo*/ ctx[3]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*name*/ 1) set_data(t0, /*name*/ ctx[0]);

    			if (dirty & /*newTodo*/ 4 && input.value !== /*newTodo*/ ctx[2]) {
    				set_input_value(input, /*newTodo*/ ctx[2]);
    			}

    			if (dirty & /*todoItems, toggleDone, deleteTodo*/ 50) {
    				each_value = /*todoItems*/ ctx[1];
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ul, destroy_block, create_each_block, null, get_each_context);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { name } = $$props;
    	let todoItems = [];
    	let newTodo = "";

    	function addTodo() {
    		$$invalidate(2, newTodo = newTodo.trim());
    		if (!newTodo) return;

    		const todo = {
    			text: newTodo,
    			checked: false,
    			id: Date.now()
    		};

    		$$invalidate(1, todoItems = [...todoItems, todo]);
    		$$invalidate(2, newTodo = "");
    	}

    	function toggleDone(id) {
    		const index = todoItems.findIndex(item => item.id === Number(id));
    		$$invalidate(1, todoItems[index].checked = !todoItems[index].checked, todoItems);
    	}

    	function deleteTodo(id) {
    		$$invalidate(1, todoItems = todoItems.filter(item => item.id !== Number(id)));
    	}

    	function input_input_handler() {
    		newTodo = this.value;
    		$$invalidate(2, newTodo);
    	}

    	const click_handler = todo => deleteTodo(todo.id);
    	const click_handler_1 = todo => toggleDone(todo.id);

    	$$self.$$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    	};

    	return [
    		name,
    		todoItems,
    		newTodo,
    		addTodo,
    		toggleDone,
    		deleteTodo,
    		input_input_handler,
    		click_handler,
    		click_handler_1
    	];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1gzung5-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, { name: 0 });
    	}
    }

    const app = new App({
      target: document.body,
      props: {
        name: 'Ray',
      },
    });

    return app;

}());
