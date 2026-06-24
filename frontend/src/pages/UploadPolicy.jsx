import { useState } from "react";
import Toast from "../components/Toast";
import UploadForm from "../components/UploadForm";

const UploadPolicy = () => {
  const [toast, setToast] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Upload Policy</h2>
        <p className="mt-1 text-sm text-slate-500">Add policy metadata and attach PDF, DOC, or DOCX files.</p>
      </div>
      <UploadForm onSaved={setToast} />
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
};

export default UploadPolicy;
