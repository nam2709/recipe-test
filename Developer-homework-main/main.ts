import { GetRecipes, GetProductsForIngredient, GetUnitsData } from "./supporting-files/data-access";
import { ExpectedRecipeSummary, RunTest } from "./supporting-files/testing";
import { UoMName, Product } from "./supporting-files/models";
import { ProductData } from "./supporting-files/data-raw";

console.clear();
console.log("Expected Result Is:", ExpectedRecipeSummary);

const recipeData = GetRecipes(); // the list of 1 recipe you should calculate the information for
console.log("Recipe Data:", recipeData);
const recipeSummary: any = {}; // the final result to pass into the test function
/*
 * YOUR CODE GOES BELOW THIS, DO NOT MODIFY ABOVE
 * (You can add more imports if needed)
 * */
console.log("Recipe Data");
console.dir(recipeData, { depth: null });

// B0: Start with the test for each ingredient at once
// const cream_ingredient = GetProductsForIngredient({ ingredientName: "Cream" })
// console.log('cream_ingredient')
// console.dir(cream_ingredient, { depth: null });

// B1: Find the cheapest supplier function base on what ingrediient put in
const findCheapestSupplier = (products: any[]) => {
    let cheapestProduct = null;
    let lowestPricePerMl = Infinity;

    for (const product of products) {
        for (const supplierProduct of product.supplierProducts) {
            const pricePerMl = supplierProduct.supplierPrice / supplierProduct.supplierProductUoM.uomAmount;

            if (pricePerMl < lowestPricePerMl) {
                lowestPricePerMl = pricePerMl;
                cheapestProduct = supplierProduct;
            }
        }
    }

    return cheapestProduct;
};

//B2: convert the ingredient and the supllier. chain multiple conversion
const convertUnits = (amount: number, fromUnit: UoMName, toUnit: UoMName, conversionTable: any[]): number => {
    if (fromUnit === toUnit) return amount; // No conversion needed

    const conversion = conversionTable.find(
        (entry) => entry.fromUnitName === fromUnit
    );

    if (!conversion) {
        throw new Error(`No conversion found for ${fromUnit} to ${toUnit}`);
    }

    const intermediateAmount = amount * conversion.conversionFactor;

    // Recursively continue conversion if needed
    if (conversion.toUnitName !== toUnit) {
        return convertUnits(intermediateAmount, conversion.toUnitName, toUnit, conversionTable);
    }

    return intermediateAmount;
};

// STEP 2: Handle nutrient fact
// Save an cheapestSuppliersList
const cheapestSuppliersList: any[] = [];

// Calculate cost
const calculateIngredientCost = (recipeLineItem: any, conversionTable: any[]) => {
    const ingredient = GetProductsForIngredient(recipeLineItem.ingredient);
    let cheapestSupplier = findCheapestSupplier(ingredient);

    // Store the cheapest supplier in the external list
    cheapestSuppliersList.push(cheapestSupplier);

    console.log('cheapestSupplier', cheapestSupplier)
    const requiredAmountMl = convertUnits(
        recipeLineItem.unitOfMeasure.uomAmount,
        recipeLineItem.unitOfMeasure.uomName,
        cheapestSupplier.supplierProductUoM.uomName,
        conversionTable
    );
    console.log('requiredAmountMl', requiredAmountMl)

    const pricePerMl = cheapestSupplier.supplierPrice / cheapestSupplier.supplierProductUoM.uomAmount;
    console.log('pricePerMl', pricePerMl)
    console.log('price', requiredAmountMl * pricePerMl)
    return requiredAmountMl * pricePerMl;
};

// Receipt cost
const calculateTotalRecipeCost = (recipe: any) => {
    const conversionTable = GetUnitsData();

    let totalCost = 0;
    for (const lineItem of recipe[0].lineItems) {
        totalCost += calculateIngredientCost(lineItem, conversionTable);
    }

    console.log(`Total recipe cost": $${totalCost}`);
    return totalCost;
};

const cheapestCost = calculateTotalRecipeCost(recipeData)
console.log(`Total cost $${cheapestCost}`);
console.log('cheapestSuppliersList', cheapestSuppliersList)

const findProductInData = (cheapestSuppliersList: any[], productData: Product[]) => {
    return cheapestSuppliersList.map(supplierItem => {
        const matchedProduct = productData.find(product => 
            product.supplierProducts.some(supplierProduct => 
                supplierProduct.supplierName === supplierItem.supplierName &&
                supplierProduct.supplierProductName === supplierItem.supplierProductName
            )
        );

        return {
            supplier: supplierItem,
            product: matchedProduct || null
        };
    });
};

// Example usage:
const matchedProducts = findProductInData(cheapestSuppliersList, ProductData);
console.log('matchedProducts');
console.dir(matchedProducts, { depth: null });

const nutrientsAtCheapestCost: Record<string, any> = {};

matchedProducts.forEach(({ product }) => {
    if (!product) return; 

    product.nutrientFacts.forEach(nutrient => {
        const { nutrientName, quantityAmount, quantityPer } = nutrient;

        if (!nutrientsAtCheapestCost[nutrientName]) {
            nutrientsAtCheapestCost[nutrientName] = {
                nutrientName,
                quantityAmount: { ...quantityAmount },
                quantityPer: { ...quantityPer }
            };
        } else {
            nutrientsAtCheapestCost[nutrientName].quantityAmount.uomAmount += quantityAmount.uomAmount;
        }
    });
});

// Convert Sodium milligrams to grams
if (nutrientsAtCheapestCost["Sodium"]?.quantityAmount?.uomName === "milligrams") {
    nutrientsAtCheapestCost["Sodium"].quantityAmount.uomAmount /= 1000;
    nutrientsAtCheapestCost["Sodium"].quantityAmount.uomName = "grams";
}

const sortedNutrients = Object.keys(nutrientsAtCheapestCost)
    .sort()
    .reduce((acc, key) => {
        acc[key] = nutrientsAtCheapestCost[key];
        return acc;
    }, {} as Record<string, any>);

console.log('nutrientsAtCheapestCost', sortedNutrients);

recipeSummary[recipeData[0].recipeName] = {
    cheapestCost: cheapestCost,
    nutrientsAtCheapestCost: sortedNutrients
};

console.log('recipeSummary')
console.dir(recipeSummary, { depth: null });
/*
 * YOUR CODE ABOVE THIS, DO NOT MODIFY BELOW
 * */
RunTest(recipeSummary);

