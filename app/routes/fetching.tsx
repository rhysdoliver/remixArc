import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigation } from "react-router";
import type { AvailableDate } from "~/models/salesforce.server";
import {
  getAppointmentCandidates,
  getAvailableDates,
  getToken,
} from "~/models/salesforce.server";

export const loader = async ({ request }: LoaderArgs) => {
  let token;
  let appointments;
  let availableDates: AvailableDate[] = [];
  const worktypeId = process.env["WORKTYPE_ID"];
  const territoryId = process.env["TERRITORY_ID"];
  try {
    token = await getToken();
    if (token)
      appointments = await getAppointmentCandidates(
        token,
        worktypeId as string,
        territoryId as string
      );
    availableDates = getAvailableDates(appointments?.candidates);
  } catch (error) {
    console.error(error);
  }

  return json({ availableDates });
};

export default function FetchingPage() {
  const { state } = useNavigation();
  const data = useLoaderData<typeof loader>();
  const isLoading = state === "loading";

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <div>Fetching data</div>
      <ul>
        {data.availableDates.map((availableDate) => (
          <div key={availableDate.date}>{availableDate.date}</div>
        ))}
      </ul>
    </div>
  );
}

// export const ErrorBoundary = ({ error }) => {
//   console.log(error);
//   return (
//     <div className="bg-red-100 p-10 text-red-500">
//       <h2>Error: {error}</h2>
//     </div>
//   );
// };
