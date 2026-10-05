import type { FactusClientConfiguration, FactusCredentials } from "./factus.client";

type Environment = NodeJS.ProcessEnv | Record<string, string | undefined>;

const REFERENCE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

const required = (environment: Environment, name: string) => {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`Missing required Factus environment variable: ${name}`);
  return value;
};

export const loadFactusCredentials = (
  reference: string,
  environment: Environment = process.env,
): FactusCredentials => {
  if (!REFERENCE_PATTERN.test(reference)) {
    throw new Error("Invalid Factus credential reference");
  }

  return {
    clientId: required(environment, `${reference}_CLIENT_ID`),
    clientSecret: required(environment, `${reference}_CLIENT_SECRET`),
    username: required(environment, `${reference}_USERNAME`),
    password: required(environment, `${reference}_PASSWORD`),
  };
};

export const loadFactusConfiguration = (
  environment: Environment = process.env,
): FactusClientConfiguration => {
  const factusEnvironment = (environment.FACTUS_ENVIRONMENT ?? "SANDBOX").trim().toUpperCase();
  if (factusEnvironment !== "SANDBOX" && factusEnvironment !== "PRODUCTION") {
    throw new Error("FACTUS_ENVIRONMENT must be SANDBOX or PRODUCTION");
  }

  const reference = (environment.FACTUS_CREDENTIAL_REFERENCE ?? "FACTUS_SANDBOX").trim();
  return {
    environment: factusEnvironment,
    credentials: loadFactusCredentials(reference, environment),
  };
};
