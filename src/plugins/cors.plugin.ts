import { cors } from "@elysiajs/cors";

import { corsHeaders, corsMethods } from "../config/cors";

export const createCorsPlugin = (origins: string[], credentials: boolean) =>
  cors({
    allowedHeaders: [...corsHeaders],
    credentials,
    methods: [...corsMethods],
    origin: origins,
  });
