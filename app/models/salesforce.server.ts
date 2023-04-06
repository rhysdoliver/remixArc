import type { AxiosInstance } from "axios";
import axios from "axios";
import dayjs from "dayjs";
import * as jwt from "jsonwebtoken";
import querystring from "querystring";

export type Token = {
  access_token: string;
  scope: string;
  instance_url: string;
  id: string;
  token_type: string;
};

export type Appointment = {
  endTime: string;
  resources: object[];
  startTime: string;
  territoryId: string;
};

export let token: Token | undefined = undefined;

const getPrivateKey = (): Buffer | null => {
  const privateKey = process.env.SF_PRIVATE_KEY;
  const tempKey = privateKey?.replace(/\\n/g, "\n");
  return tempKey ? Buffer.from(tempKey) : null;
};

export function getParams(): { grant_type?: string; assertion: string } {
  const expiry = Math.floor(Date.now() / 1000) + 300;

  const jwtParams = {
    iss: process.env.SF_CONSUMER_KEY,
    sub: process.env.SF_USERNAME,
    aud: process.env.SF_TOKEN_AUDIENCE,
    exp: expiry,
  };
  const privateKey = getPrivateKey();
  if (!privateKey) throw new Error("invalid Private Key");
  const token = jwt.sign(jwtParams, privateKey, { algorithm: "RS256" });

  return {
    grant_type: process.env.SF_CONNECTED_APP_GRANT_TYPE,
    assertion: token,
  };
}

const MAX_RETRY = 3;

export const getToken = async (retry = 0): Promise<Token> => {
  if (retry === MAX_RETRY)
    throw new Error(`Unable to fetch token after ${retry} attempts, exiting`);

  if (token) {
    console.info("Found stored token");
    try {
      await axios.post(token.id, undefined, {
        headers: {
          "Accept-Encoding": "deflate, br",
          Authorization: `Bearer ${token.access_token}`,
        },
      });
      console.info("stored salesforce token valid");
      return token;
    } catch (error) {
      token = undefined;
      console.info("token invalid, fetching new token");
      console.info(error);
    }
  }

  const params = getParams();

  const absoluteTokenUrl: string =
    (process.env.SF_BASE_URL || "") + (process.env.SF_TOKEN_URL || "");

  const tokenResponse: Token = await axios
    .post(absoluteTokenUrl, querystring.stringify(params), {
      headers: { "Accept-Encoding": "deflate, br" },
    })
    .then((res) => {
      return res.data;
    })
    .catch((error) => {
      console.error(`Retry Attempt: ${retry}`, error);
      return getToken(retry + 1);
    });
  token = tokenResponse;

  return tokenResponse;
};

type SalesforceSchedulingRequest = {
  startTime: string;
  endTime: string;
  territoryIds: string[];
  workType: {
    id: string | undefined;
  };
  schedulingPolicyId: string | undefined;
};

export const generateRequestBody = (
  startTime: dayjs.Dayjs,
  endTime: dayjs.Dayjs,
  schedulingPolicyId: string,
  territoryIds: string[],
  workTypeId: string
): SalesforceSchedulingRequest => {
  return {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    territoryIds,
    schedulingPolicyId,
    workType: {
      id: workTypeId,
    },
  };
};

type CandidatesResponse = {
  candidates: Appointment[];
};

export const getAppointmentCandidates = async (
  token: Token,
  worktypeId: string,
  territoryId: string
): Promise<CandidatesResponse> => {
  const salesforce = createSalesforceInstance(token);

  // TODO: Update 3 fields below and do dayjs properly
  const request = generateRequestBody(
    dayjs().add(3, "hours"),
    dayjs().add(14, "days").endOf("day"),
    process.env.SCHEDULE_POLICY_ID as string,
    [territoryId],
    worktypeId
  );

  const response = await salesforce.post(
    `/services/data/v55.0/scheduling/getAppointmentCandidates`,
    request
  );
  return response.data;
};

export const getServiceAppointment = async (
  token: Token,
  appointmentId: string
): Promise<string> => {
  const salesforce = createSalesforceInstance(token);

  const response = await salesforce.get(
    `/services/data/v55.0/sobjects/ServiceAppointment/${appointmentId}`
  );

  return response.data;
};

const createSalesforceInstance = (token: Token): AxiosInstance => {
  const salesforce = axios.create({
    baseURL: token.instance_url,
    headers: {
      "Accept-Encoding": "deflate, br",
      Authorization: `Bearer ${token.access_token}`,
    },
  });
  return salesforce;
};

export type AvailableDate = {
  date: string;
  times: string[];
};

type GetAvailableDates = (appointments?: Appointment[]) => AvailableDate[];

export const getAvailableDates: GetAvailableDates = (appointments = []) => {
  const response: AvailableDate[] = [];
  appointments.map((appointment) => {
    const date = dayjs(appointment.startTime).format("YYYY-MM-DD");
    const time = dayjs(appointment.startTime).format("h:mma");

    const dateIndex = response.findIndex((r) => r.date === date);
    // If date found in response, push time to array
    if (dateIndex !== -1) {
      const timeIndex = response[dateIndex].times.findIndex((t) => t === time);
      if (timeIndex === -1) response[dateIndex].times.push(time);
    } else {
      response.push({ date, times: [time] });
    }
  });
  return response;
};
