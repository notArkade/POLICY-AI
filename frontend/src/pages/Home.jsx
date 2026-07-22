import { Link } from "react-router-dom";
import { BrainCircuit, Database, KeyRound, SearchCheck } from "lucide-react";

const features = [
  { title: "AI Policy Assistance", icon: BrainCircuit, text: "Employees can ask everyday HR policy questions and get quick guidance." },
  { title: "Instant Policy Search", icon: SearchCheck, text: "Uploaded policies stay easy to browse, filter, and reference." },
  { title: "Role-Based Policy Access", icon: KeyRound, text: "Mock admin and employee views keep policy workflows organized." },
  { title: "HR Knowledge Base", icon: Database, text: "A central place for HR teams to manage policy information." },
];

const Home = () => {
  return (
    <main>
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">AI-powered HR support</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
              The Company Policy Assistant
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              A modern company portal where employees can discover policy answers and HR admins can organize policy documents.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#about" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
                Learn More
              </a>
              <a href="#policies" className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                View Policies
              </a>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Policy answer</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">Annual leave balance</h2>
                </div>
                <span className="rounded-md bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">Verified</span>
              </div>
              <p className="mt-5 text-sm leading-6 text-slate-600">
                Employees receive 18 annual leaves. Unused leave handling and approval timelines depend on department policy.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {["18 leaves", "5 categories", "24/7 help"].map((item) => (
                  <div key={item} className="rounded-lg bg-slate-50 p-3 text-center text-sm font-semibold text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="policies" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map(({ title, text, icon: Icon }) => (
            <article key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <Icon className="h-6 w-6 text-blue-600" />
              <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="about" className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-slate-950">About The Company</h2>
          <p className="mt-4 max-w-3xl text-slate-600">
            The Company is a mock company experience for HR policy management. The portal combines employee-facing policy discovery with an admin dashboard for uploading documents, maintaining categories, and reviewing chatbot interactions.
          </p>
        </div>
      </section>

      <footer id="contact" className="border-t border-slate-200 bg-slate-950 py-10 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
          <div>
            <h2 className="font-semibold text-white">The Company</h2>
            <p className="mt-3 text-sm leading-6">AI-assisted HR policy support for modern teams.</p>
          </div>
          <div>
            <h2 className="font-semibold text-white">Quick links</h2>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Link to="/">Home</Link>
              <Link to="/login">Login as Admin</Link>
            </div>
          </div>
          <div>
            <h2 className="font-semibold text-white">Contact</h2>
            <p className="mt-3 text-sm">hr@acmepeopleops.com</p>
            <p className="mt-1 text-sm">+1 555 014 9012</p>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Home;
