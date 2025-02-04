import {openai} from '@ai-sdk/openai';
import {generateObject, LanguageModel, tool} from 'ai';
import {z} from 'zod';
import postgres from "postgres";
import {drizzle} from "drizzle-orm/postgres-js";

type Result = Record<string, string | number>;

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);
const openai_model = openai("gpt-4o-mini")

const configSchema = z
    .object({
        description: z
            .string()
            .describe(
                "Describe the chart. What is it showing? What is interesting about the way the data is displayed?",
            ),
        takeaway: z.string().describe("What is the main takeaway from the chart?"),
        type: z.enum(["bar", "line", "area", "pie"]).describe("Type of chart"),
        title: z.string(),
        xKey: z.string().describe("Key for x-axis or category"),
        yKeys: z.array(z.string()).describe("Key(s) for y-axis values this is typically the quantitative column"),
        multipleLines: z.boolean().describe("For line charts only: whether the chart is comparing groups of data.").optional(),
        measurementColumn: z.string().describe("For line charts only: key for quantitative y-axis column to measure against (eg. values, counts etc.)").optional(),
        lineCategories: z.array(z.string()).describe("For line charts only: Categories used to compare different lines or data series. Each category represents a distinct line in the chart.").optional(),
        colors: z
            .record(
                z.string().describe("Any of the yKeys"),
                z.string().describe("Color value in CSS format (e.g., hex, rgb, hsl)"),
            )
            .describe("Mapping of data keys to color values for chart elements")
            .optional(),
        legend: z.boolean().describe("Whether to show legend"),
    })
    .describe("Chart configuration object");

export type Config = z.infer<typeof configSchema>;

export const generateQuery = async (input: string, model?: LanguageModel) => {
    "use server";
    try {
        const result = await generateObject({
            model: model ? model : openai_model,
            system: `You are a SQL (postgres) and data visualization expert. Your job is to help the user write a SQL query to retrieve the data they need. The table schema is as follows:
  
        unicorns (
        id SERIAL PRIMARY KEY,
        company VARCHAR(255) NOT NULL UNIQUE,
        valuation DECIMAL(10, 2) NOT NULL,
        date_joined DATE,
        country VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        industry VARCHAR(255) NOT NULL,
        select_investors TEXT NOT NULL
      );
  
      Only retrieval queries are allowed.
  
      For things like industry, company names and other string fields, use the ILIKE operator and convert both the search term and the field to lowercase using LOWER() function. For example: LOWER(industry) ILIKE LOWER('%search_term%').
  
      Note: select_investors is a comma-separated list of investors. Trim whitespace to ensure you're grouping properly. Note, some fields may be null or have only one value.
      When answering questions about a specific field, ensure you are selecting the identifying column (ie. what is Vercel's valuation would select company and valuation').
  
      The industries available are:
      - healthcare & life sciences
      - consumer & retail
      - financial services
      - enterprise tech
      - insurance
      - media & entertainment
      - industrials
      - health
  
      If the user asks for a category that is not in the list, infer based on the list above.
  
      Note: valuation is in billions of dollars so 10b would be 10.0.
      Note: if the user asks for a rate, return it as a decimal. For example, 0.1 would be 10%.
  
      If the user asks for 'over time' data, return by year.
  
      When searching for UK or USA, write out United Kingdom or United States respectively.
  
      EVERY QUERY SHOULD RETURN QUANTITATIVE DATA THAT CAN BE PLOTTED ON A CHART! There should always be at least two columns. If the user asks for a single column, return the column and the count of the column. If the user asks for a rate, return the rate as a decimal. For example, 0.1 would be 10%.
      `,
            prompt: `Generate the query necessary to retrieve the data the user wants: ${input}`,
            schema: z.object({
                query: z.string(),
            }),
        });
        return result.object.query;
    } catch (e) {
        console.error(e);
        throw new Error("Failed to generate query");
    }
};

export const runGenerateSQLQuery = async (query: string) => {
    "use server";
    // Check if the query is a SELECT statement
    if (
        !query.trim().toLowerCase().startsWith("select") ||
        query.trim().toLowerCase().includes("drop") ||
        query.trim().toLowerCase().includes("delete") ||
        query.trim().toLowerCase().includes("insert") ||
        query.trim().toLowerCase().includes("update") ||
        query.trim().toLowerCase().includes("alter") ||
        query.trim().toLowerCase().includes("truncate") ||
        query.trim().toLowerCase().includes("create") ||
        query.trim().toLowerCase().includes("grant") ||
        query.trim().toLowerCase().includes("revoke")
    ) {
        throw new Error("Only SELECT queries are allowed");
    }

    let data: any;
    try {
        data = await db.execute(query);
    } catch (e: any) {
        if (e.message.includes('relation "unicorns" does not exist')) {
            console.log(
                "Table does not exist, creating and seeding it with dummy data now...",
            );
            // throw error
            throw Error("Table does not exist");
        } else {
            throw e;
        }
    }

    return data as Result[];
};

export const generateChartConfig = async (
    results: Result[],
    userQuery: string,
    model?: LanguageModel
) => {
    "use server";
    const system = `You are a data visualization expert. `;

    try {
        const { object: config } = await generateObject({
            model: model ? model : openai_model,
            system,
            prompt: `Given the following data from a SQL query result, generate the chart config that best visualises the data and answers the users query.
        For multiple groups use multi-lines.
  
        Here is an example complete config:
        export const chartConfig = {
          type: "pie",
          xKey: "month",
          yKeys: ["sales", "profit", "expenses"],
          colors: {
            sales: "#4CAF50",    // Green for sales
            profit: "#2196F3",   // Blue for profit
            expenses: "#F44336"  // Red for expenses
          },
          legend: true
        }
  
        User Query:
        ${userQuery}
  
        Data:
        ${JSON.stringify(results, null, 2)}`,
            schema: configSchema,
        });

        const colors: Record<string, string> = {};
        config.yKeys.forEach((key, index) => {
            colors[key] = `hsl(var(--chart-${index + 1}))`;
        });

        const updatedConfig: Config = { ...config, colors };
        return { config: updatedConfig };
    } catch (e) {
        // @ts-expect-errore
        console.error(e.message);
        throw new Error("Failed to generate chart suggestion");
    }
};

export const queryDatabase = (model: LanguageModel) => tool({
    description: 'Query the database to find relevant information for the user query.',
    parameters: z.object({
        query: z.string().describe('The user query for which a corresponding SQL query needs to be created'),
    }),
    execute: async ({ query }) => {
        const sql = await generateQuery(query, model);
        const data = await runGenerateSQLQuery(sql);
        const columns = data.length > 0 ? Object.keys(data[0]) : [];
        const generation = await generateChartConfig(data, query, model);
        return { results: data, columns, config: generation?.config };
    },
});
