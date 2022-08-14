<script>
    export let name
    let todoItems = [];
    let newTodo = '';

    function addTodo() {
        newTodo = newTodo.trim();
        if (!newTodo) return;

        const todo = {
            text: newTodo,
            checked: false,
            id: Date.now(),
        };

        todoItems = [...todoItems, todo];
        newTodo = '';
    }

    function toggleDone(id) {
        const index = todoItems.findIndex(item => item.id === Number(id));
        todoItems[index].checked = !todoItems[index].checked;
    }

    function deleteTodo(id) {
        todoItems = todoItems.filter(item => item.id !== Number(id));
    }
</script>

<div class="main-app">
    <h1>{name}'s ToDos</h1>

    <form on:submit|preventDefault={addTodo}>
        <input
            class="add-input"
            type="text"
            aria-label="Enter a new todo item"
            placeholder="Enter the name of the ToDo"
            bind:value = {newTodo}
        >
        <span>
            <button
                on:click={addTodo}
            >
                Add
            </button>
        </span>
    </form>
    <ul class="todo-list">
        {#each todoItems as todo (todo.id)}
            <li
                class="todo-item
                {todo.checked ? 'done' : ''}"
            >
                <button
                    class="delete-todo"
                    on:click={() => deleteTodo(todo.id)}
                >
                    X
                </button>
                <input
                    id={todo.id}
                    type="checkbox"
                    on:click={() => toggleDone(todo.id)}
                />
                <span>
                    {todo.text}
                </span>
            </li>
        {/each}
    </ul>
</div>

<style>

    * {
        margin: 5px;
        padding: 5px;
    }

    .main-app{
        border: 2px solid black;
        background: paleturquoise;
    }

    .todo-list{
        list-style-type: none;
        display: flex;
        flex-wrap: wrap;
    }

    .todo-item{
        border:2px solid red;
        width: 25%;
        padding: 2px;
        background: aliceblue;
        border-radius: 10px;
        font-weight: bold;
    }

    .add-input {
        width: 30%;
    }

    .done{
        border: 2px solid green;
        font-weight: normal;
    }
    .done span{
        text-decoration: line-through;
    }
</style>