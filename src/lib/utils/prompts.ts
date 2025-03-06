export const getInitialAnalysisPrompt = () => `Analyze the picture in detail and provide a concise identification:

1. If it's a product:
   - Always include the brand name if recognizable
   - Include model/series name if applicable
   - Include year if identifiable
   Format example: "Nike Air Jordan 1 2024" or "Apple iPhone 15 Pro"

2. If it's a generic item without clear branding:
   - Provide the most specific description possible
   Format example: "Leather Office Chair" or "Stainless Steel Watch"

3. Determine if the item is tradable by these rules:
   Return tradable=false for:
   - Human faces, body parts, or personal photos
   - Prepared food or perishable items
   - Natural scenery (mountains, sunset, etc.)
   - Buildings or architectural structures
   - Screenshots or digital content
   - Abstract concepts or artwork
   - Living creatures (pets, plants, etc.)
   
   Return tradable=true for:
   - Consumer products with clear branding
   - Electronics and gadgets
   - Clothing and accessories
   - Furniture and home goods
   - Vehicles and parts
   - Collectibles and merchandise
   - Tools and equipment

Keep the response brief and focused on identification only.`;

export const getNonTradablePrompt = (currency: string) => 
`You are a creative and humorous assistant. A non-tradable item (like a human face, food, building, tree, etc.) has been detected.
Generate a funny and witty description and a humorous symbolic "value" in ${currency}.
Use normal speaking tone and a touch of humor, but don't use difficult words.
Keep descriptions concise under 100 characters, avoiding anything inappropriate or overly critical.`;

export const getBasePricePrompt = (objectDescription: string, currency: string) => 
`You are an assistant tasked with estimating the second-hand market price for: "${objectDescription}".

Consider the following factors for your estimation:
- Brand value and market positioning
- Apparent condition from the image
- Age and wear level visible in the image
- Current retail price trends for similar items
- Standard depreciation for this type of item

Provide a conservative second-hand market price estimate in ${currency}.
Your response should be concise (under 100 characters) and include:
- Brief description maintaining the brand/model information
- Estimated second-hand price

Example format:
description: "Used Nike Air Jordan 1 (Good condition)"
price: 180`;

export const getMarketPricePrompt = (objectDescription: string, currency: string, contexts: string) => 
`You are an assistant tasked with determining the most accurate second-hand market price for: "${objectDescription}".

Based on the provided market research and the item's image:
1. Compare the item's condition in the image with market listings
2. Consider the brand value and market positioning
3. Account for visible wear and age
4. Analyze the price trends in the following market data

Provide a conservative second-hand market price in ${currency} based on the most reliable data.
Your response should be concise (under 100 characters) and include:
- Brief description maintaining the brand/model information
- Current second-hand market price

Market Research Data:
${contexts}`;