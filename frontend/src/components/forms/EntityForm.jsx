import React, { useState, useEffect } from "react";
import { Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import TextField from "./fields/TextField";
import NumberField from "./fields/NumberField";
import SelectField from "./fields/SelectField";
import TextArea from "./fields/TextArea";
import PasswordField from "./fields/PasswordField";
import Button from "../common/Button";

function EntityForm({
    config,
    initialData = null,
    onSubmit,
    onCancel,
    submitLabel = null,
    extraProps = {},
}) {
    const [values, setValues] = useState(() => ({
        ...config.defaultValues,
        ...(initialData || {}),
    }));

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState("");

    useEffect(() => {
        if (initialData) {
            setValues({
                ...config.defaultValues,
                ...initialData,
            });
        }
    }, [initialData, config.defaultValues]);

    function handleFieldChange(name, value) {
        setValues((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (errors[name]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    }

    function handleOrderItemChange(index, field, val) {
        setValues((prev) => {
            const items = [...(prev.items || [])];
            items[index] = {
                ...items[index],
                [field]: field === "inventoryId" || field === "quantity" ? Number(val) : val,
            };
            return { ...prev, items };
        });

        if (errors.items) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next.items;
                return next;
            });
        }
    }

    function addOrderItem() {
        setValues((prev) => ({
            ...prev,
            items: [...(prev.items || []), { inventoryId: "", quantity: 1 }],
        }));
    }

    function removeOrderItem(index) {
        setValues((prev) => ({
            ...prev,
            items: (prev.items || []).filter((_, i) => i !== index),
        }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitError("");
        setSubmitSuccess("");

        if (config.schema) {
            const result = config.schema.safeParse(values);
            if (!result.success) {
                const fieldErrors = {};
                for (const issue of result.error.issues) {
                    const path = issue.path.join(".");
                    if (!fieldErrors[path]) {
                        fieldErrors[path] = issue.message;
                    }
                }
                setErrors(fieldErrors);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            await onSubmit(values);
            setSubmitSuccess(`${config.entityName} saved successfully.`);
        } catch (err) {
            setSubmitError(err?.message || String(err) || "Failed to submit form.");
        } finally {
            setIsSubmitting(false);
        }
    }

    const availableProducts = extraProps.inventory || [];

    const orderGrandTotal = (values.items || []).reduce((acc, itm) => {
        const prod = availableProducts.find(
            (p) => String(p.id ?? p.Id) === String(itm.inventoryId)
        );
        const price = Number(prod?.unitPrice ?? prod?.UnitPrice ?? 0);
        const qty = Number(itm.quantity || 0);
        return acc + price * qty;
    }, 0);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {submitError && (
                <div className="p-3 border border-[var(--accent)] bg-[color-mix(in_srgb,var(--paper)_70%,white)] rounded-[2px] flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-[var(--accent)] shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-xs text-[var(--ink)] leading-relaxed">
                        {submitError}
                    </span>
                </div>
            )}

            {submitSuccess && (
                <div className="p-3 border border-[var(--ink)] bg-[var(--paper)] rounded-[2px] flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-[var(--ink)] shrink-0 mt-0.5" strokeWidth={1.5} />
                    <span className="text-xs text-[var(--ink)] leading-relaxed">
                        {submitSuccess}
                    </span>
                </div>
            )}

            {config.fields.map((field) => {
                const val = values[field.name];
                const err = errors[field.name];

                switch (field.type) {
                    case "text":
                        return (
                            <TextField
                                key={field.name}
                                name={field.name}
                                label={field.label}
                                value={val}
                                onChange={(newVal) => handleFieldChange(field.name, newVal)}
                                placeholder={field.placeholder}
                                hint={field.hint}
                                error={err}
                                required={field.required}
                                disabled={field.disabled || isSubmitting}
                            />
                        );

                    case "password":
                        return (
                            <PasswordField
                                key={field.name}
                                name={field.name}
                                label={field.label}
                                value={val}
                                onChange={(newVal) => handleFieldChange(field.name, newVal)}
                                placeholder={field.placeholder}
                                hint={field.hint}
                                error={err}
                                required={field.required}
                                disabled={field.disabled || isSubmitting}
                            />
                        );

                    case "number":
                        return (
                            <NumberField
                                key={field.name}
                                name={field.name}
                                label={field.label}
                                value={val}
                                onChange={(newVal) => handleFieldChange(field.name, newVal)}
                                placeholder={field.placeholder}
                                hint={field.hint}
                                error={err}
                                min={field.min}
                                max={field.max}
                                step={field.step}
                                required={field.required}
                                disabled={field.disabled || isSubmitting}
                            />
                        );

                    case "select":
                        return (
                            <SelectField
                                key={field.name}
                                name={field.name}
                                label={field.label}
                                value={val}
                                onChange={(newVal) => handleFieldChange(field.name, newVal)}
                                options={field.options}
                                placeholder={field.placeholder}
                                hint={field.hint}
                                error={err}
                                required={field.required}
                                disabled={field.disabled || isSubmitting}
                            />
                        );

                    case "textarea":
                        return (
                            <TextArea
                                key={field.name}
                                name={field.name}
                                label={field.label}
                                value={val}
                                onChange={(newVal) => handleFieldChange(field.name, newVal)}
                                placeholder={field.placeholder}
                                hint={field.hint}
                                error={err}
                                rows={field.rows || 3}
                                required={field.required}
                                disabled={field.disabled || isSubmitting}
                            />
                        );

                    case "order-items":
                        return (
                            <div key={field.name} className="space-y-3 pt-2 border-t border-[var(--line)]">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs uppercase tracking-wider font-semibold text-[color-mix(in_srgb,var(--ink)_80%,white)]">
                                        {field.label}
                                        {field.required && <span className="text-[var(--accent)] ml-1">*</span>}
                                    </label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        icon={Plus}
                                        onClick={addOrderItem}
                                        disabled={isSubmitting}
                                    >
                                        Add Line Item
                                    </Button>
                                </div>

                                {err && (
                                    <p className="text-xs text-[var(--accent)] font-medium">
                                        {err}
                                    </p>
                                )}

                                <div className="space-y-2">
                                    {(values.items || []).map((itm, idx) => {
                                        const selectedProd = availableProducts.find(
                                            (p) => String(p.id ?? p.Id) === String(itm.inventoryId)
                                        );
                                        const unitPrice = selectedProd?.unitPrice ?? selectedProd?.UnitPrice ?? 0;
                                        const stockAvailable = selectedProd?.quantityAvailable ?? selectedProd?.QuantityAvailable ?? 0;
                                        const lineTotal = Number(unitPrice) * Number(itm.quantity || 0);

                                        return (
                                            <div
                                                key={idx}
                                                className="p-3 bg-[var(--paper)] border border-[var(--line)] rounded-[2px] space-y-2"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-mono text-xs font-semibold uppercase text-[color-mix(in_srgb,var(--ink)_70%,white)]">
                                                        Line #{idx + 1}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeOrderItem(idx)}
                                                        className="p-1 text-[color-mix(in_srgb,var(--ink)_50%,white)] hover:text-[var(--accent)] transition-colors"
                                                        title="Remove item"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                    <div className="sm:col-span-2">
                                                        <SelectField
                                                            value={itm.inventoryId}
                                                            onChange={(val) => handleOrderItemChange(idx, "inventoryId", val)}
                                                            options={availableProducts.map((p) => ({
                                                                value: p.id ?? p.Id,
                                                                label: `${p.sku ?? p.SKU} - ${p.name ?? p.Name} ($${Number(p.unitPrice ?? p.UnitPrice).toFixed(2)})`,
                                                            }))}
                                                            placeholder="Select product..."
                                                            required
                                                            disabled={isSubmitting}
                                                        />
                                                    </div>

                                                    <div>
                                                        <NumberField
                                                            value={itm.quantity}
                                                            onChange={(val) => handleOrderItemChange(idx, "quantity", val)}
                                                            placeholder="Qty"
                                                            min={1}
                                                            max={stockAvailable > 0 ? stockAvailable : 99999}
                                                            required
                                                            disabled={isSubmitting}
                                                        />
                                                    </div>
                                                </div>

                                                {selectedProd && (
                                                    <div className="flex items-center justify-between text-xs pt-1 text-[color-mix(in_srgb,var(--ink)_65%,white)] font-mono tabular-nums">
                                                        <span>
                                                            Unit: ${Number(unitPrice).toFixed(2)} | Avail: {stockAvailable}
                                                        </span>
                                                        <span className="font-semibold text-[var(--ink)]">
                                                            Line Total: ${lineTotal.toFixed(2)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-2 p-3 bg-white border border-[var(--line)] rounded-[2px] flex items-center justify-between">
                                    <span className="text-xs uppercase tracking-wider font-semibold text-[color-mix(in_srgb,var(--ink)_75%,white)]">
                                        Estimated Order Total:
                                    </span>
                                    <span className="font-mono text-base font-bold tabular-nums text-[var(--ink)]">
                                        ${orderGrandTotal.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        );

                    default:
                        return null;
                }
            })}

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--line)]">
                {onCancel && (
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                )}
                <Button
                    type="submit"
                    variant="primary"
                    loading={isSubmitting}
                >
                    {submitLabel || (initialData ? `Update ${config.entityName}` : `Create ${config.entityName}`)}
                </Button>
            </div>
        </form>
    );
}

export default EntityForm;
