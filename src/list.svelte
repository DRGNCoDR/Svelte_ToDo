<script>
    import {current_Todos} from "./store.js"

    const Remove = (todo_id) => {
        $current_Todos = $current_Todos
            .filter(todo => todo.id != todo_id)
    }

    const ToggleComplete = (todo_id) => {

        if (document.getElementsByClassName("check-" + todo_id)[0].checked)
        {
            document.getElementsByClassName("todo-" + todo_id)[0]
                .classList.add("border-green")
            document.getElementsByClassName("title-" + todo_id)[0]
                .classList.add("complete")
            document.getElementsByClassName("description-" + todo_id)[0]
                .classList.add("complete")

            document.getElementsByClassName("todo-" + todo_id)[0]
                .classList.remove("border-red")
        }
        else
        {
            document.getElementsByClassName("todo-" + todo_id)[0]
                .classList.add("border-red")

            document.getElementsByClassName("todo-" + todo_id)[0]
                .classList.remove("border-green")
            document.getElementsByClassName("title-" + todo_id)[0]
                .classList.remove("complete")
            document.getElementsByClassName("description-" + todo_id)[0]
                .classList.remove("complete")

        }
    }
</script>

    {#each $current_Todos as todo }
        <div
            class="
                todo-{todo.id}
                border-red
            "
        >
            <h4
                class="title-{todo.id}"
            >
                {todo.title}
            </h4>

            <p
                class="description-{todo.id}"
            >
                {todo.description}
            </p>

            <input
                class = "
                    check-{todo.id}
                    complete
                "
                type = "checkbox"
                bind:checked = {todo.checked}
                on:change= {ToggleComplete(todo.id)}
                placeholder = "Done"
            />

            <button
                on:click={Remove(todo.id)}
            >
                X
            </button>
        </div>
    {/each}

<style>
    .border-red {
        border: 2px solid red;
    }
    .border-green {
        border: 2px solid green;
    }
    .border-black {
        border: 2px solid black;
    }
    .complete {
        text-decoration: line-through;
    }
</style>