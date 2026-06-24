import { useMemo, useState } from "react";
import { Edit2, Eye, Search, Trash2 } from "lucide-react";
import Modal from "./Modal";
import { storage } from "../services/localStorageService";

const PolicyTable = () => {
  const [policies, setPolicies] = useState(storage.getPolicies);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const departments = [...new Set(policies.map((policy) => policy.department).filter(Boolean))];
  const categories = storage.getCategories();

  const filtered = useMemo(() => {
    return policies.filter((policy) => {
      const matchesQuery = policy.policyName.toLowerCase().includes(query.toLowerCase());
      const matchesDepartment = !department || policy.department === department;
      const matchesCategory = !category || policy.category === category;
      return matchesQuery && matchesDepartment && matchesCategory;
    });
  }, [policies, query, department, category]);

  const deletePolicy = (id) => setPolicies(storage.deletePolicy(id));

  const saveEdit = (event) => {
    event.preventDefault();
    setPolicies(storage.updatePolicy(editing));
    setEditing(null);
  };

  return (
    <>
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_220px_220px]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Search policies by name"
          />
        </label>
        <select value={department} onChange={(event) => setDepartment(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All departments</option>
          {departments.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Policy Name</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">File Name</th>
                <th className="px-4 py-3">Upload Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((policy) => (
                <tr key={policy.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-950">{policy.policyName}</td>
                  <td className="px-4 py-3 text-slate-600">{policy.department}</td>
                  <td className="px-4 py-3 text-slate-600">{policy.category}</td>
                  <td className="px-4 py-3 text-slate-600">{policy.fileName}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(policy.uploadDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button type="button" aria-label="View policy" onClick={() => setViewing(policy)} className="rounded-md p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button type="button" aria-label="Edit policy" onClick={() => setEditing(policy)} className="rounded-md p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button type="button" aria-label="Delete policy" onClick={() => deletePolicy(policy.id)} className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                    No policies found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && (
        <Modal title="Policy Details" onClose={() => setViewing(null)}>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {Object.entries({
              "Policy Name": viewing.policyName,
              Department: viewing.department,
              Category: viewing.category,
              "File Name": viewing.fileName,
              "Upload Date": new Date(viewing.uploadDate).toLocaleString(),
              Description: viewing.description,
            }).map(([label, value]) => (
              <div key={label} className={label === "Description" ? "sm:col-span-2" : ""}>
                <dt className="font-medium text-slate-500">{label}</dt>
                <dd className="mt-1 text-slate-950">{value}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Policy" onClose={() => setEditing(null)}>
          <form onSubmit={saveEdit} className="grid gap-4">
            {["policyName", "department", "category"].map((field) => (
              <label key={field} className="space-y-2 text-sm font-medium capitalize text-slate-700">
                {field.replace("policyName", "policy name")}
                <input
                  value={editing[field]}
                  onChange={(event) => setEditing({ ...editing, [field]: event.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            ))}
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Description
              <textarea
                value={editing.description}
                onChange={(event) => setEditing({ ...editing, description: event.target.value })}
                rows={4}
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <button type="submit" className="justify-self-start rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              Update Policy
            </button>
          </form>
        </Modal>
      )}
    </>
  );
};

export default PolicyTable;
