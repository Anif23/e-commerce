import axios from "../../api/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "react-hot-toast";
import { userAPI } from "../../api/user";
import { useAuthStore } from "../../store/authStore";

const Todos = () => {

    const navigate = useNavigate();

    const [todoList, setTodoList] = useState([]);
    const [title, setTitle] = useState("");

    const fetchTodos = async () => {
        try {
            const res = await axios.get("/todos");

            setTodoList(res.data?.todos || []);
        } catch (err) {
            console.error(err);
            setTodoList([]);
        }
    };
    useEffect(() => {
        fetchTodos();
    }, []);

    const handleAdd = async () => {
        if (!title.trim()) return;

        try {
            const res = await axios.post("/todos", {
                title,
                completed: false,
                priority: 1
            });
            setTitle("");

            if (res.data.success) {
                toast.success("Todo added successfully!");
            }
            fetchTodos();
        } catch (err) {
            toast.error("Failed to add todo");
            console.error(err);
        }
    };

    const toggleTodo = async (todo: any) => {
        try {
            const res = await axios.put(`/todos/${todo.id}`, {
                title: todo.title,
                completed: !todo.completed,
            });

            if (res.data.success) {
                toast.success("Todo updated successfully!");
            }
            fetchTodos();
        } catch (err) {
            toast.error("Failed to update todo");
            console.error(err);
        }
    };

    const deleteTodo = async (id: number) => {
        try {
            const res = await axios.delete(`/todos/${id}`);

            if (res.data.success) {
                toast.success("Todo deleted successfully!");
            }
            fetchTodos();
        } catch (err) {
            toast.error("Failed to delete todo");
            console.error(err);
        }
    };

    const handleLogout =
        async () => {
            try {
                await userAPI.logout();
            } finally {
                useAuthStore
                    .getState()
                    .logout();

                window.location.href =
                    "/login";
            }
        };


    const completed =
        todoList.filter(
            (t: any) => t.completed
        ).length;

    const pending =
        todoList.length -
        completed;

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">

            {/* HEADER */}
            <div className="border-b border-white/10 backdrop-blur-lg sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">

                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            Todo Dashboard
                        </h1>
                        <p className="text-xs text-gray-400">
                            Manage your daily tasks
                        </p>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600"
                    >
                        Logout
                    </button>

                </div>
            </div>

            <div className="max-w-5xl mx-auto p-6">

                {/* STATS */}
                <div className="grid md:grid-cols-3 gap-4 mb-6">

                    <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                        <p className="text-gray-400 text-sm">
                            Total Tasks
                        </p>
                        <h2 className="text-3xl font-bold text-white">
                            {todoList.length}
                        </h2>
                    </div>

                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5">
                        <p className="text-green-300 text-sm">
                            Completed
                        </p>
                        <h2 className="text-3xl font-bold text-white">
                            {completed}
                        </h2>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-5">
                        <p className="text-yellow-300 text-sm">
                            Pending
                        </p>
                        <h2 className="text-3xl font-bold text-white">
                            {pending}
                        </h2>
                    </div>

                </div>

                {/* ADD TODO */}
                <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">

                    <div className="flex gap-3">

                        <input
                            value={title}
                            onChange={(e) =>
                                setTitle(
                                    e.target.value
                                )
                            }
                            placeholder="Add a new task..."
                            className="flex-1 border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                        />

                        <button
                            onClick={handleAdd}
                            className="px-6 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                        >
                            Add
                        </button>

                    </div>

                </div>

                {/* TODOS */}
                <div className="space-y-3">

                    {todoList.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 text-center">
                            <div className="text-6xl mb-4">
                                📝
                            </div>

                            <h3 className="font-semibold text-xl">
                                No Todos Found
                            </h3>

                            <p className="text-gray-500 mt-2">
                                Add your first task
                            </p>
                        </div>
                    ) : (
                        todoList.map(
                            (todo: any) => (
                                <div
                                    key={todo.id}
                                    className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-lg transition"
                                >

                                    <div className="flex items-center gap-4">

                                        <input
                                            type="checkbox"
                                            checked={
                                                todo.completed
                                            }
                                            onChange={() =>
                                                toggleTodo(
                                                    todo
                                                )
                                            }
                                            className="w-5 h-5"
                                        />

                                        <div>
                                            <p
                                                className={
                                                    todo.completed
                                                        ? "line-through text-gray-400"
                                                        : "font-medium"
                                                }
                                            >
                                                {todo.title}
                                            </p>

                                            <p className="text-xs text-gray-400">
                                                Task #
                                                {todo.id}
                                            </p>
                                        </div>

                                    </div>

                                    <button
                                        onClick={() =>
                                            deleteTodo(
                                                todo.id
                                            )
                                        }
                                        className="w-9 h-9 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
                                    >
                                        ✕
                                    </button>

                                </div>
                            )
                        )
                    )}

                </div>

            </div>

        </div>
    );
};

export default Todos;