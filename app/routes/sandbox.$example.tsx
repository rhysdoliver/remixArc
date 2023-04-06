import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = ({ request, params }: LoaderArgs) => {
  return json({ params });
};

export default function ChildPage() {
  const data = useLoaderData<typeof loader>();
  return (
    <div>
      <h2>Hello Outlet: {data.params.example}</h2>
    </div>
  );
}

export const ErrorBoundary = ({ error }) => {
  return (
    <div className="bg-red-100 p-10 text-red-500">
      <h2>Error</h2>
    </div>
  );
};
