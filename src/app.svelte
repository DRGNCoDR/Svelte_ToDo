<script>
$: todos = []

const Add = (todo) => {
todo.id = Date.now()
todos.push(todo)
todos = todos
}

const Remove = (id) => {
todos = todos.filter(todos => todos.id != id)
}

// const ToggleComplete = (todo) => {
//     //document.getElementById("todo-" + {id}).classList.toggle("complete")
// }
</script>

<h1>
Todos
</h1>
<div>
    <!--Component 1: Add-->
    <form
    on:submit|preventDefault = {Add({...todos})}>
        <div>
            <div>
                <input
                    bind:value={todos.title}
                    placeholder="Title"/>
            </div>
            <div>
                <textarea
                    bind:value={todos.description}
                    placeholder="Description"
                ></textarea>
            </div>
        </div>
    </form>

    <!--Component 2: List-->
    <div class="border-black">
        {#each todos as todo}
            <div
                class="border-red"
            >
                <h4 class="title-{todo.id}">
                    {todo.title}
                </h4>

                <p>
                    {todo.description}
                </p>

                <input
                class="check-{todo.id} "
                type="checkbox"
                    bind:checked={todo.checked}
                    placeholder="Done"/>

                <div>
                    <button on:click={Remove(todo.id)}>
                        X
                    </button>
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    .border-red{
        border: 2px solid red;
    }
    .border-green{
        border: 2px solid green;
    }
    .border-black{
        border: 2px solid black;
    }
    .complete{
        text-decoration: line-through;
    }
</style>
