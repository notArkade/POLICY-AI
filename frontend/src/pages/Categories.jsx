import { useState } from "react";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { storage } from "../services/localStorageService";

const Categories = () => {
  const [categories, setCategories] = useState(storage.getCategories);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState("");

  const persist = (next) => {
    setCategories(next);
    storage.saveCategories(next);
  };

  const addCategory = (event) => {
    event.preventDefault();
    const value = name.trim();
    if (!value || categories.includes(value)) return;
    persist([...categories, value]);
    setName("");
  };

  const updateCategory = (oldValue, newValue) => {
    const value = newValue.trim();
    if (!value) return;
    persist(categories.map((category) => (category === oldValue ? value : category)));
    setEditing("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Policy Categories</h2>
        <p className="mt-1 text-sm text-slate-500">Maintain the categories used while uploading policies.</p>
      </div>
      <form onSubmit={addCategory} className="flex max-w-xl gap-2">
        <input value={name} onChange={(event) => setName(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Add category" />
        <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => (
          <article key={category} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            {editing === category ? (
              <input autoFocus defaultValue={category} onBlur={(event) => updateCategory(category, event.target.value)} onKeyDown={(event) => event.key === "Enter" && updateCategory(category, event.currentTarget.value)} className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm" />
            ) : (
              <span className="font-medium text-slate-800">{category}</span>
            )}
            <div className="ml-3 flex gap-1">
              <button type="button" aria-label="Edit category" onClick={() => setEditing(category)} className="rounded-md p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700">
                <Edit2 className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Delete category" onClick={() => persist(categories.filter((item) => item !== category))} className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default Categories;
