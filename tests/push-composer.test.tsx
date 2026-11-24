import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PushComposer from "@/components/dashboard/PushComposer";
import { pushApi } from "@/lib/projects/api";

vi.mock("@/lib/projects/api", () => ({
  pushApi: {
    deepLinks: { list: vi.fn(), create: vi.fn(), delete: vi.fn() },
    templates: {
      create: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      translate: vi.fn(),
    },
    campaigns: { create: vi.fn(), audiencePreview: vi.fn() },
  },
  audienceGroupsApi: { list: vi.fn(async () => []) },
  lifecycleSegmentsApi: { list: vi.fn(async () => []) },
}));
vi.mock("@/hooks/projects/use-active-project", () => ({
  useActiveProject: () => ({ active: { id: "p1" } }),
}));

const push = vi.mocked(pushApi, true);

const saveDraft = async (mode: "campaign" | "template") => {
  const onSaved = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PushComposer mode={mode} onBack={() => {}} onSaved={onSaved} />
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByLabelText(/Push notification name/), {
    target: { value: "Promo" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save as draft" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 2000 });
  return onSaved.mock.calls[0]![0];
};

describe("PushComposer · Save as draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    push.deepLinks.list.mockResolvedValue([]);
    push.deepLinks.create.mockResolvedValue({
      id: "d1",
      url: "pixlpush://home",
    } as never);
    push.deepLinks.delete.mockResolvedValue(undefined);
    push.templates.create.mockResolvedValue({ id: "t1" } as never);
    push.templates.get.mockResolvedValue({} as never);
    push.templates.update.mockResolvedValue({ id: "t1" } as never);
    push.templates.translate.mockResolvedValue({ translations: {} } as never);
    push.campaigns.create.mockResolvedValue({ id: "c1" } as never);
  });

  it("push notification mode saves a campaign draft", async () => {
    expect(await saveDraft("campaign")).toBe("drafts");
    expect(push.campaigns.create).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({ name: "Promo", sendNow: false }),
    );
    expect(push.templates.create).not.toHaveBeenCalled();
  });

  it("template mode saves a campaign draft when Save as draft is clicked", async () => {
    expect(await saveDraft("template")).toBe("drafts");
    expect(push.campaigns.create).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({
        name: "Promo",
        category: "template",
        sendNow: false,
        scheduledAt: undefined,
      }),
    );
    expect(push.templates.create).not.toHaveBeenCalled();
  });

  it("keeps a draft unscheduled even when a delivery date was selected", async () => {
    const onSaved = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PushComposer mode="campaign" onBack={() => {}} onSaved={onSaved} />
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByLabelText(/Push notification name/), {
      target: { value: "Promo" },
    });
    fireEvent.click(screen.getByLabelText("Specific date"));
    fireEvent.change(screen.getByLabelText("Select date"), {
      target: { value: "2026-10-01" },
    });
    fireEvent.change(screen.getByLabelText("Time"), {
      target: { value: "09:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save as draft" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 2000 });
    expect(push.campaigns.create).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({ sendNow: false, scheduledAt: undefined }),
    );
  });

  it("sends only the selected language codes to the translation API", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PushComposer mode="campaign" onBack={() => {}} onSaved={() => {}} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add language" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Arabic" }));
    fireEvent.click(screen.getByRole("button", { name: "Select languages" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Select languages" }),
      ).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Auto translate/ }));
    await waitFor(() =>
      expect(push.templates.translate).toHaveBeenCalledWith("p1", {
        title: "Welcome to PixlPush 🎉",
        body: "Start your first match now — exciting profiles are waiting for you! ❤️",
        languages: ["en", "ar"],
      }),
    );
  });

  it("opens an existing template and updates that template instead of creating a duplicate", async () => {
    push.deepLinks.list.mockResolvedValue([
      { id: "d1", url: "pixlpush://home" },
    ] as never);
    push.templates.get.mockResolvedValue({
      id: "t1",
      projectId: "p1",
      name: "Existing template",
      title: "Existing title",
      body: "Existing body",
      deepLink: "pixlpush://home",
      translations: { ar: { title: "عنوان", body: "رسالة" } },
      fallbackLanguage: "ar",
      category: "template",
      status: "active",
    } as never);

    const onSaved = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PushComposer
          mode="template"
          templateId="t1"
          onBack={() => {}}
          onSaved={onSaved}
        />
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(screen.getByLabelText(/Push notification name/)).toHaveValue(
        "Existing template",
      ),
    );
    expect(screen.getByLabelText(/Title \(English\)/)).toHaveValue(
      "Existing title",
    );
    expect(screen.getByLabelText(/Message \(English\)/)).toHaveValue(
      "Existing body",
    );
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save as draft" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Push notification name/), {
      target: { value: "Updated template" },
    });
    fireEvent.change(screen.getByLabelText(/Title \(English\)/), {
      target: { value: "Updated title" },
    });
    fireEvent.change(screen.getByLabelText(/Message \(English\)/), {
      target: { value: "Updated body" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(push.templates.update).toHaveBeenCalledWith(
        "p1",
        "t1",
        expect.objectContaining({
          name: "Updated template",
          title: "Updated title",
          body: "Updated body",
          category: "template",
        }),
      ),
    );
    expect(push.templates.create).not.toHaveBeenCalled();
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("templates"));
  });
});
