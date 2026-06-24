import PolicyTable from "../components/PolicyTable";

const ExistingPolicies = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-950">Existing Policies</h2>
        <p className="mt-1 text-sm text-slate-500">Search, filter, view, edit, or delete uploaded policies.</p>
      </div>
      <PolicyTable />
    </div>
  );
};

export default ExistingPolicies;
