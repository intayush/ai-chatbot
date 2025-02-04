import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import "dotenv/config"
import postgres from "postgres";
import {drizzle} from "drizzle-orm/postgres-js";


const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

function parseDate(dateString: string): string {
    const parts = dateString.split('-');
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
    }
    console.warn(`Could not parse date: ${dateString}`);
    throw Error();
}

export async function seed() {
    console.log("connection client created")
    try {
        const createTable = await db.execute(`
                            CREATE TABLE IF NOT EXISTS unicorns (
                                id SERIAL PRIMARY KEY,
                                company VARCHAR(255) NOT NULL UNIQUE,
                                valuation DECIMAL(10, 2) NOT NULL,
                                date_joined DATE,
                                country VARCHAR(255) NOT NULL,
                                city VARCHAR(255) NOT NULL,
                                industry VARCHAR(255) NOT NULL,
                                select_investors TEXT NOT NULL
                             );
                            `);

        console.log(`Created "unicorns" table`);

        const results: any[] = [];
        const csvFilePath = path.join(process.cwd(), 'unicorns.csv');

        await new Promise((resolve, reject) => {
            fs.createReadStream(csvFilePath)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', resolve)
                .on('error', reject);
        });

        for (const row of results) {
            const formattedDate = parseDate(row['Date Joined']);

            console.log(row['﻿Company'],
                parseFloat(row['Valuation ($B)'].replace('$', '').replace(',', '')),
                formattedDate,
                row.Country,
                row.City,
                row.Industry,
                row['Select Investors']);

            // @ts-ignore
            await db.execute(`
                INSERT INTO unicorns (company, valuation, date_joined, country, city, industry, select_investors)
                VALUES ('${row['﻿Company']}',
                        ${parseFloat(row['Valuation ($B)'].replace('$', '').replace(',', ''))},
                        '${formattedDate}',
                        '${row.Country}',
                        '${row.City}',
                        '${row.Industry}',
                        '${row['Select Investors']}') ON CONFLICT (company) DO NOTHING;
            `);

        }

        console.log(`Seeded ${results.length} unicorns`);

        return {
            createTable,
            unicorns: results,
        };
    } catch (e) {
        console.error("Error seeding database", e)
    }
}


seed().then(() => console.log("completed")).catch(console.error);