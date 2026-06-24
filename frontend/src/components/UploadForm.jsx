import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { storage } from "../services/localStorageService";
import { uploadPolicy } from "../services/api";

const emptyForm = {
  policyName: "",
  department: "",
  category: "",
  description: "",
};

const allowedTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const UploadForm = ({ onSaved }) => {
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const categories = storage.getCategories();

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;
    if (!allowedTypes.includes(selectedFile.type) && !/\.(pdf|doc|docx)$/i.test(selectedFile.name)) {
      setError("Only PDF, DOC, and DOCX files are allowed.");
      setFile(null);
      return;
    }
    setError("");
    setFile(selectedFile);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.policyName || !form.department || !form.category || !form.description || !file) {
      setError("Please complete all fields and upload a document.");
      return;
    }

    const formData = new FormData();
    formData.append("policy_name", form.policyName);
    formData.append("department", form.department);
    formData.append("category", form.category);
    formData.append("description", form.description);
    formData.append("file", file);

    try {
      setUploading(true);
      setProgress(0);
      const response = await uploadPolicy(formData, (event) => {
        if (!event.total) return;
        setProgress(Math.round((event.loaded * 100) / event.total));
      });
      const policy = response.data.policy;
      storage.addPolicy({
        id: policy.id,
        policyName: policy.policy_name,
        department: policy.department,
        category: policy.category,
        description: policy.description,
        fileName: policy.file_name,
        uploadDate: policy.upload_date,
      });
      setForm(emptyForm);
      setFile(null);
      setError("");
      onSaved?.(response.data.message || "Policy uploaded successfully.");
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Policy Name
          <input
            value={form.policyName}
            onChange={(event) => setField("policyName", event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Annual Leave Policy"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Department
          <input
            value={form.department}
            onChange={(event) => setField("department", event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Human Resources"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Category
          <select
            value={form.category}
            onChange={(event) => setField("category", event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        Description
        <textarea
          value={form.description}
          onChange={(event) => setField("description", event.target.value)}
          rows={4}
          className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          placeholder="Briefly describe this policy."
        />
      </label>

      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleFile(event.dataTransfer.files?.[0]);
        }}
        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/60 px-4 py-8 text-center hover:border-blue-400"
      >
        <UploadCloud className="h-9 w-9 text-blue-600" />
        <span className="mt-3 text-sm font-semibold text-slate-900">
          {file ? file.name : "Drag and drop a policy document"}
        </span>
        <span className="mt-1 text-sm text-slate-500">PDF, DOC, or DOCX</span>
        <input type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(event) => handleFile(event.target.files?.[0])} />
      </label>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {uploading && (
        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-slate-500">Uploading and indexing policy... {progress}%</p>
        </div>
      )}

      <button
        type="submit"
        disabled={uploading}
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {uploading ? "Indexing..." : "Save Policy"}
      </button>
    </form>
  );
};

export default UploadForm;
