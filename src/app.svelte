<script>
    import {current_Todos} from "./store.js"
    import Add from './add.svelte'
    import List from './list.svelte'
</script>

<h1>
    Todos
</h1>

<div>
    <Add {...$current_Todos}/>

    <List {...$current_Todos}/>
</div>