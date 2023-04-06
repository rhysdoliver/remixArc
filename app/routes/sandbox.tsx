import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, Outlet, useLoaderData } from "@remix-run/react";

export const loader = async ({ request }: LoaderArgs) => {
  const loaderData = [
    { id: 1, label: "Demo 1" },
    { id: 2, label: "Demo 2" },
    { id: 3, label: "Demo 3" },
    { id: 4, label: "Demo 4" },
  ];
  return json({ data: loaderData });
};

export const action = async ({ request }: ActionArgs) => {
  const body = await request.formData();
  const example = body.get("example");
  const entries = body.entries();
  console.log("entries", entries);
  console.log("example", example);
  return redirect(`/sandbox/${example}`);
};

export default function SandboxPage() {
  const data = useLoaderData<typeof loader>();
  return (
    <div id="header">
      <div className="bg-gradient-to-r from-blue-500 to-blue-800 px-6 py-8 text-white">
        <h1 className="text-xl">Cool Remix App</h1>
      </div>
      <div id="main">
        <ul>
          {data.data.map((item) => (
            <li key={item.id}>{item.label}</li>
          ))}
        </ul>
        <div id="data-fetching">
          <Link to="/fetching" prefetch="intent">
            Fetch Data
          </Link>
        </div>
        <Form method="post" className="mx-auto flex max-w-sm flex-col gap-4">
          <input
            name="example"
            className="rounded border-2 border-slate-300 px-3 py-1"
            type="text"
          />
          <button
            type="submit"
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Submit
          </button>
        </Form>
        <Outlet />
      </div>
    </div>
  );
}
