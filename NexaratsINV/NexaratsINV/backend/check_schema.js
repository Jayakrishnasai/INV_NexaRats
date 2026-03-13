const dotenv = require('dotenv');
dotenv.config();

async function checkSchema() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        console.error("Missing SUPABASE env vars.");
        process.exit(1);
    }

    try {
        const res = await fetch(`${url}/rest/v1/?apikey=${key}`);
        const swagger = await res.json();

        // Find the products table definition and the status column
        if (swagger.definitions && swagger.definitions.products) {
            console.log("Products table structure:", JSON.stringify(swagger.definitions.products, null, 2));
        } else {
            console.log("Products table not found in OpenAPI definition?!", Object.keys(swagger.definitions || {}));
        }
    } catch (error) {
        console.error("Error fetching schema:", error);
    }
}

checkSchema();
