<script>
$: todos = []

const Add = (todo) => {
todo.id = Date.now()
todos.push(todo)
console.log(todos)
}

const Remove = (id) => {
todos = todos.filter(todos => todos.id != id)
console.log(todos)
}
</script>

<h1>
Todos
</h1>

<div>
    {#each todos as todo}
    <div>
        <button on:click={Remove(todo.id)}>X</button>
    </div>
    {/each}
</div>
<div>
    <form on:submit|preventDefault = {Add({...todos})}>
        <div>
            <div>
                <input
                    bind:value={todos.title}
                    placeholder="Title"/>
                <input type="checkbox"
                    bind:checked={todos.complete}
                    placeholder="Done"/>
            </div>
            <div>
                <textarea
                    bind:value={todos.description}
                    placeholder="Description"
                ></textarea>
            </div>
        </div>
    </form>
</div>
