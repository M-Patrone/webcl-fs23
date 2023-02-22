// requires ../observable/observable.js
// requires ./fortuneService.js
// requires ../dataflow/dataflow.js

const TodoController = () => {

    const Validator = (val,errorMsg)=>{
        const checkValue = (curVal)=>{
                return val(curVal)
            }
        return {
            getMessage: ()=>errorMsg,
            isValid: (curVal) => checkValue(curVal)
        }
    }
    const Property = () =>{
        const propertyValue = Observable();
        const validators = [];
        const errorMessage = ""
        return {
            setValidator: val => validators.push(val),
            getValue: ()=> propertyValue,
            getValidators: () => validators,
            setValue: (val)=>{
                propertyValue.setValue(val);
            },
            getError: ()=>{
                let s="";
                validators.forEach(v=>{
                    if(!v.isValid(propertyValue.getValue())){
                        s += v.getMessage();
                    }
                })
                return s;
            }
        }

    }

    const Todo = () => {
        const textAttr = Property();
        textAttr.setValue("text");

        const val = Validator((v=>v.length>3),"Der Text ist nicht genug lang")

        textAttr.setValidator(val);
        // facade
        //const textAttr = Observable("text");            // we currently don't expose it as we don't use it elsewhere
        const doneAttr = Observable(false);
        return {
            getDone:       doneAttr.getValue,
            setDone:       doneAttr.setValue,
            onDoneChanged: doneAttr.onChange,
            setText:       textAttr.setValue,
            getText:       textAttr.getValue().getValue,
            onTextChanged: textAttr.getValue().onChange,
            getErrorMsg: textAttr.getError
        }
    };

    const todoModel = ObservableList([]); // observable array of Todos, this state is private
    const scheduler = Scheduler();

    const addTodo = () => {
        const newTodo = Todo();
        todoModel.add(newTodo);
        return newTodo;
    };

    const addFortuneTodo = () => {

        const newTodo = Todo();

        todoModel.add(newTodo);
        newTodo.setText('...');

        scheduler.add( ok =>
           fortuneService( text => {        // schedule the fortune service and proceed when done
                   newTodo.setText(text);
                   ok();
               }
           )
        );
    };

    return {
        numberOfTodos:      todoModel.count,
        numberOfopenTasks:  () => todoModel.countIf( todo => ! todo.getDone() ),
        addTodo:            addTodo,
        addFortuneTodo:     addFortuneTodo,
        removeTodo:         todoModel.del,
        onTodoAdd:          todoModel.onAdd,
        onTodoRemove:       todoModel.onDel,
        removeTodoRemoveListener: todoModel.removeDeleteListener, // only for the test case, not used below
    }
};


// View-specific parts

const TodoItemsView = (todoController, rootElement) => {

    const render = todo => {

        function createElements() {
            const template = document.createElement('DIV'); // only for parsing
            template.innerHTML = `
                <button class="delete">&times;</button>
                <input type="text" size="42">
                <input type="checkbox">  
                <b style="color:red; width: 100vw" ></b>          
            `;
            return template.children;
        }
        const [deleteButton, inputElement, checkboxElement, errorMsg] = createElements();

        checkboxElement.onclick = _ => todo.setDone(checkboxElement.checked);
        deleteButton.onclick    = _ => todoController.removeTodo(todo);

        inputElement.oninput = _ => todo.setText(inputElement.value);


        todoController.onTodoRemove( (removedTodo, removeMe) => {
            if (removedTodo !== todo) return;
            rootElement.removeChild(inputElement);
            rootElement.removeChild(deleteButton);
            rootElement.removeChild(checkboxElement);
            rootElement.removeChild(errorMsg)
            removeMe();
        } );

        todo.onTextChanged(() => {
            inputElement.value = todo.getText();
            errorMsg.textContent = todo.getErrorMsg();
        });

        rootElement.appendChild(deleteButton);
        rootElement.appendChild(inputElement);
        rootElement.appendChild(checkboxElement);
        rootElement.appendChild(errorMsg);
    };

    // binding

    todoController.onTodoAdd(render);

    // we do not expose anything as the view is totally passive.
};

const TodoTotalView = (todoController, numberOfTasksElement) => {

    const render = () =>
        numberOfTasksElement.innerText = "" + todoController.numberOfTodos();

    // binding

    todoController.onTodoAdd(render);
    todoController.onTodoRemove(render);
};

const TodoOpenView = (todoController, numberOfOpenTasksElement) => {

    const render = () =>
        numberOfOpenTasksElement.innerText = "" + todoController.numberOfopenTasks();

    // binding

    todoController.onTodoAdd(todo => {
        render();
        todo.onDoneChanged(render);
    });
    todoController.onTodoRemove(render);
};


