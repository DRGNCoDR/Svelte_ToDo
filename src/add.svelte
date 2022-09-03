<script>
    import {current_Todos} from "./store.js"

    const Add = (todo) => {
        $current_Todos = [...$current_Todos, {
            id: Date.now(),
            title:todo.title,
            description: todo.description
        }]
    }
</script>

<form>
    <div>
        <div>
            <input
                bind:value = { $current_Todos.title }
                placeholder = "Title"
            />
        </div>
        <div>
            <textarea
                bind:value = { $current_Todos.description }
                placeholder = "Description"
            ></textarea>
        </div>
        <button
            on:click|preventDefault = { Add($current_Todos) }
        >
            + Add
        </button>
    </div>
</form>