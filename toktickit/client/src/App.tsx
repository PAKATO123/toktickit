import { useState } from "react";
import { checkSystem, Category } from "./api.js";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);

  async function handleCheck() {
    setState("loading");
    try {
      const status = await checkSystem();
      setCategories(status.categories);
      setState("success");
    } catch (error) {
      console.error(error);
      setState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {state === "success" && (
        <div className="mt-4 alert alert-success">
          <div>System Status: Online.</div>
          {categories.length > 0 && (
            <ul className="mt-2 mb-0">
              {categories.map((cat) => (
                <li key={cat.id}>{cat.name}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {state === "error" && (
        <div className="mt-4 alert alert-danger">
          System Status: Offline
        </div>
      )}
    </div>
  );
}

