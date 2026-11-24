import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TemplateSaveDialog from "@/components/dashboard/TemplateSaveDialog";

describe("TemplateSaveDialog", () => {
  it("offers update and save-as-new actions when editing reusable email content", async () => {
    const onUpdate = vi.fn(async () => true);
    const onSaveAsNew = vi.fn(async () => true);
    const onClose = vi.fn();

    render(
      <TemplateSaveDialog
        open
        onClose={onClose}
        onUpdate={onUpdate}
        onSaveAsNew={onSaveAsNew}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Update reusable email" }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledOnce());
    expect(onSaveAsNew).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps the dialog open when the selected save action fails", async () => {
    const onUpdate = vi.fn(async () => false);
    const onSaveAsNew = vi.fn(async () => true);
    const onClose = vi.fn();

    render(
      <TemplateSaveDialog
        open
        onClose={onClose}
        onUpdate={onUpdate}
        onSaveAsNew={onSaveAsNew}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Update reusable email" }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledOnce());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
