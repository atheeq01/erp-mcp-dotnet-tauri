import { z } from "zod";

export const productConfig = {
    entityName: "Product",
    schema: z.object({
        sku: z
            .string()
            .trim()
            .min(1, "SKU is required")
            .max(50, "SKU cannot exceed 50 characters"),
        name: z
            .string()
            .trim()
            .min(1, "Product name is required")
            .max(150, "Product name cannot exceed 150 characters"),
        description: z
            .string()
            .max(2000, "Description cannot exceed 2000 characters")
            .optional()
            .default(""),
        quantityAvailable: z
            .number({ invalid_type_error: "Must be a valid number" })
            .int("Quantity must be a whole number")
            .min(0, "Quantity cannot be negative"),
        unitPrice: z
            .number({ invalid_type_error: "Must be a valid number" })
            .min(0, "Unit price cannot be negative"),
        isActive: z.boolean().optional().default(true),
    }),
    fields: [
        {
            name: "sku",
            label: "SKU / Code",
            type: "text",
            placeholder: "e.g. SKU-1001",
            required: true,
            hint: "Unique identifier for this inventory item",
        },
        {
            name: "name",
            label: "Product Name",
            type: "text",
            placeholder: "e.g. Steel Bolt 10mm",
            required: true,
        },
        {
            name: "description",
            label: "Description",
            type: "textarea",
            placeholder: "Specification, dimensions, material...",
            rows: 3,
            required: false,
        },
        {
            name: "quantityAvailable",
            label: "Initial Stock Units",
            type: "number",
            min: 0,
            step: 1,
            required: true,
            hint: "Physical quantity currently on hand",
        },
        {
            name: "unitPrice",
            label: "Unit Price ($)",
            type: "number",
            min: 0,
            step: 0.01,
            required: true,
            placeholder: "0.00",
        },
        {
            name: "isActive",
            label: "Product Active Status",
            type: "toggle",
            required: false,
            hint: "Active products can be ordered; inactive items are archived",
        },
    ],
    defaultValues: {
        sku: "",
        name: "",
        description: "",
        quantityAvailable: 0,
        unitPrice: 0,
        isActive: true,
    },
};

export const orderConfig = {
    entityName: "Customer Order",
    schema: z.object({
        items: z
            .array(
                z.object({
                    inventoryId: z
                        .union([z.number(), z.string()])
                        .refine((val) => val !== "" && !isNaN(Number(val)), {
                            message: "Select a valid product",
                        }),
                    quantity: z
                        .number({ invalid_type_error: "Quantity required" })
                        .int("Must be whole number")
                        .min(1, "Minimum 1 unit required"),
                })
            )
            .min(1, "At least one item must be included in the order"),
    }),
    fields: [
        {
            name: "items",
            label: "Order Line Items",
            type: "order-items",
            required: true,
        },
    ],
    defaultValues: {
        items: [{ inventoryId: "", quantity: 1 }],
    },
};

export const userConfig = {
    entityName: "User Account",
    schema: z.object({
        username: z
            .string()
            .trim()
            .min(3, "Username must contain at least 3 characters")
            .max(50, "Username cannot exceed 50 characters"),
        password: z
            .string()
            .min(8, "Password must contain at least 8 characters")
            .max(100, "Password too long"),
        role: z.enum(["Sales", "Store"], {
            errorMap: () => ({ message: "Select a valid role ('Sales' or 'Store')" }),
        }),
    }),
    fields: [
        {
            name: "username",
            label: "Username",
            type: "text",
            placeholder: "e.g. john.smith",
            required: true,
            hint: "Employee login identifier",
        },
        {
            name: "password",
            label: "Initial Password",
            type: "password",
            placeholder: "Minimum 8 characters",
            required: true,
            hint: "Employee must change password upon first access",
        },
        {
            name: "role",
            label: "Authorization Role",
            type: "select",
            options: [
                { value: "Sales", label: "Sales (Orders & Catalog)" },
                { value: "Store", label: "Store (Inventory Control)" },
            ],
            required: true,
            placeholder: "Select security role...",
            hint: "Controls accessible system modules",
        },
    ],
    defaultValues: {
        username: "",
        password: "",
        role: "Sales",
    },
};
