// routes/admin.tsx
import { Handlers, PageProps } from "$fresh/server.ts";
import { getAuditLogs, getKv, saveAuditLog } from "../utils/db.ts";
import { AuditLog, Pledge } from "../types.ts";

interface AdminData {
    pledges: Pledge[];
    stats: {
        totalAmount: number;
        averagePledge: number;
        uniqueDonors: number;
        topDonor: Pledge;
    };
    groupedPledges: Map<string, Pledge[]>;
    auditLogs: AuditLog[];
    filters: {
        search?: string;
        minAmount?: number;
        maxAmount?: number;
        startDate?: string;
        endDate?: string;
        sortColumn?: string;
        sortDirection?: "asc" | "desc";
    };
}

export const handler: Handlers<AdminData> = {
    async GET(req, ctx) {
        const url = new URL(req.url);
        const filters = {
            search: url.searchParams.get("search") || undefined,
            minAmount: Number(url.searchParams.get("minAmount")) || undefined,
            maxAmount: Number(url.searchParams.get("maxAmount")) || undefined,
            startDate: url.searchParams.get("startDate") || undefined,
            endDate: url.searchParams.get("endDate") || undefined,
            sortColumn: url.searchParams.get("sortColumn") || "timestamp",
            sortDirection:
                url.searchParams.get("sortDirection") as "asc" | "desc" ||
                "desc",
        };

        const db = await getKv();
        let pledges: Pledge[] = [];

        // Fetch all pledges
        for await (const entry of db.list({ prefix: ["pledges"] })) {
            const pledge = entry.value as Pledge;

            // Apply filters
            if (
                filters.search &&
                !pledge.name.toLowerCase().includes(
                    filters.search.toLowerCase(),
                ) &&
                !pledge.email.toLowerCase().includes(
                    filters.search.toLowerCase(),
                ) &&
                !pledge.organization?.toLowerCase().includes(
                    filters.search.toLowerCase(),
                )
            ) {
                continue;
            }

            if (filters.minAmount && pledge.amount < filters.minAmount) {
                continue;
            }
            if (filters.maxAmount && pledge.amount > filters.maxAmount) {
                continue;
            }
            if (
                filters.startDate && pledge.timestamp &&
                new Date(pledge.timestamp) < new Date(filters.startDate)
            ) continue;
            if (
                filters.endDate && pledge.timestamp &&
                new Date(pledge.timestamp) > new Date(filters.endDate)
            ) continue;

            pledges.push(pledge);
        }

        // Sort pledges
        pledges.sort((a, b) => {
            const direction = filters.sortDirection === "asc" ? 1 : -1;
            switch (filters.sortColumn) {
                case "name":
                    return direction * a.name.localeCompare(b.name);
                case "email":
                    return direction * a.email.localeCompare(b.email);
                case "amount":
                    return direction * (a.amount - b.amount);
                case "organization":
                    return direction *
                        ((a.organization || "").localeCompare(
                            b.organization || "",
                        ));
                default:
                    return direction *
                        (new Date(b.timestamp!).getTime() -
                            new Date(a.timestamp!).getTime());
            }
        });

        // Group pledges by email
        const groupedPledges = new Map<string, Pledge[]>();
        pledges.forEach((pledge) => {
            const existing = groupedPledges.get(pledge.email) || [];
            existing.push(pledge);
            groupedPledges.set(pledge.email, existing);
        });

        // Get latest pledge per user for stats
        const latestPledges = Array.from(groupedPledges.values()).map(
            (userPledges) =>
                userPledges.sort((a, b) =>
                    new Date(b.timestamp!).getTime() -
                    new Date(a.timestamp!).getTime()
                )[0],
        );

        const totalAmount = latestPledges.reduce((sum, p) => sum + p.amount, 0);
        const stats = {
            totalAmount,
            averagePledge: totalAmount / latestPledges.length || 0,
            uniqueDonors: latestPledges.length,
            topDonor: latestPledges.sort((a, b) => b.amount - a.amount)[0],
        };

        const auditLogs = await getAuditLogs();

        return ctx.render({
            pledges,
            stats,
            groupedPledges,
            auditLogs,
            filters,
        });
    },

    async POST(req) {
        const db = await getKv();
        const formData = await req.formData();
        const action = formData.get("action");

        switch (action) {
            case "delete": {
                const id = formData.get("id") as string;
                const pledge = (await db.get(["pledges", id])).value as Pledge;
                await db.delete(["pledges", id]);
                await saveAuditLog({
                    id: crypto.randomUUID(),
                    action: "delete",
                    pledgeId: id,
                    previousData: pledge,
                    timestamp: new Date().toISOString(),
                });
                break;
            }

            case "update": {
                const id = formData.get("id") as string;
                const oldPledge = (await db.get(["pledges", id]))
                    .value as Pledge;
                const newPledge = {
                    ...oldPledge,
                    name: formData.get("name"),
                    organization: formData.get("organization"),
                    amount: Number(formData.get("amount")),
                };

                await db.set(["pledges", id], newPledge);
                await saveAuditLog({
                    id: crypto.randomUUID(),
                    action: "update",
                    pledgeId: id,
                    previousData: oldPledge,
                    newData: newPledge,
                    timestamp: new Date().toISOString(),
                });
                break;
            }
        }

        return new Response(null, {
            status: 303,
            headers: { Location: "/admin" },
        });
    },
};

export default function Admin({ data }: PageProps<AdminData>) {
    const { filters } = data;

    const getSortLink = (column: string) => {
        const newDirection =
            filters.sortColumn === column && filters.sortDirection === "desc"
                ? "asc"
                : "desc";
        const params = new URLSearchParams(filters as Record<string, string>);
        params.set("sortColumn", column);
        params.set("sortDirection", newDirection);
        return `?${params.toString()}`;
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="max-w-7xl mx-auto py-6 px-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
                    Admin Dashboard
                </h1>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-gray-500 text-sm font-medium">
                            Total Pledged
                        </h3>
                        <p className="text-2xl font-bold text-gray-900">
                            RM{data.stats.totalAmount.toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-gray-500 text-sm font-medium">
                            Average Pledge
                        </h3>
                        <p className="text-2xl font-bold text-gray-900">
                            RM{Math.round(data.stats.averagePledge)
                                .toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-gray-500 text-sm font-medium">
                            Unique Donors
                        </h3>
                        <p className="text-2xl font-bold text-gray-900">
                            {data.stats.uniqueDonors}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-gray-500 text-sm font-medium">
                            Top Donor
                        </h3>
                        <p className="text-2xl font-bold text-gray-900">
                            {data.stats.topDonor?.name}
                        </p>
                        <p className="text-sm text-gray-500">
                            RM{data.stats.topDonor?.amount.toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow mb-8 p-4">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                        Filters
                    </h2>
                    <form className="grid grid-cols-3 gap-4">
                        <input
                            type="text"
                            name="search"
                            placeholder="Search..."
                            defaultValue={filters.search}
                            className="border rounded p-2"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="number"
                                name="minAmount"
                                placeholder="Min Amount"
                                defaultValue={filters.minAmount}
                                className="border rounded p-2"
                            />
                            <input
                                type="number"
                                name="maxAmount"
                                placeholder="Max Amount"
                                defaultValue={filters.maxAmount}
                                className="border rounded p-2"
                            />
                        </div>
                        <button
                            type="submit"
                            className="bg-blue-600 text-white rounded px-4"
                        >
                            Apply Filters
                        </button>
                    </form>
                </div>

                {/* Grouped Pledges */}
                <div className="bg-white shadow rounded-lg mb-8">
                    <div className="px-4 py-5 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">
                            Pledges by User
                        </h2>
                    </div>
                    {Array.from(data.groupedPledges.entries()).map((
                        [email, pledges],
                    ) => (
                        <div
                            key={email}
                            className="border-b border-gray-200 p-4"
                        >
                            <div className="font-medium mb-2">
                                {pledges[0].name} ({email})
                            </div>
                            <table className="min-w-full">
                                <thead>
                                    <tr>
                                        <th className="text-left">
                                            <a
                                                href={getSortLink("timestamp")}
                                                className="text-gray-500"
                                            >
                                                Date
                                            </a>
                                        </th>
                                        <th className="text-left">
                                            <a
                                                href={getSortLink("amount")}
                                                className="text-gray-500"
                                            >
                                                Amount
                                            </a>
                                        </th>
                                        <th className="text-left">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pledges.map((pledge) => (
                                        <tr
                                            key={pledge.id}
                                            className="hover:bg-gray-50"
                                        >
                                            <td className="py-2">
                                                {new Date(pledge.timestamp!)
                                                    .toLocaleString()}
                                            </td>
                                            <td className="py-2">
                                                RM{pledge.amount
                                                    .toLocaleString()}
                                            </td>
                                            <td className="py-2">
                                                <button
                                                    onClick={() => {
                                                        const form = document
                                                            .getElementById(
                                                                `edit-${pledge.id}`,
                                                            );
                                                        if (form) {
                                                            form.style.display =
                                                                form.style
                                                                        .display ===
                                                                        "none"
                                                                    ? "block"
                                                                    : "none";
                                                        }
                                                    }}
                                                    className="text-blue-600 mr-2"
                                                >
                                                    Edit
                                                </button>
                                                <form
                                                    method="POST"
                                                    className="inline"
                                                    onSubmit={(e) => {
                                                        if (
                                                            !confirm(
                                                                "Are you sure?",
                                                            )
                                                        ) e.preventDefault();
                                                    }}
                                                >
                                                    <input
                                                        type="hidden"
                                                        name="action"
                                                        value="delete"
                                                    />
                                                    <input
                                                        type="hidden"
                                                        name="id"
                                                        value={pledge.id}
                                                    />
                                                    <button
                                                        type="submit"
                                                        className="text-red-600"
                                                    >
                                                        Delete
                                                    </button>
                                                </form>
                                                <div
                                                    id={`edit-${pledge.id}`}
                                                    style="display:none"
                                                    className="mt-2"
                                                >
                                                    <form
                                                        method="POST"
                                                        className="space-y-2"
                                                    >
                                                        <input
                                                            type="hidden"
                                                            name="action"
                                                            value="update"
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="id"
                                                            value={pledge.id}
                                                        />
                                                        <div>
                                                            <input
                                                                type="text"
                                                                name="name"
                                                                defaultValue={pledge
                                                                    .name}
                                                                className="border rounded p-1 w-full"
                                                            />
                                                        </div>
                                                        <div>
                                                            <input
                                                                type="text"
                                                                name="organization"
                                                                defaultValue={pledge
                                                                    .organization}
                                                                className="border rounded p-1 w-full"
                                                                placeholder="Organization"
                                                            />
                                                        </div>
                                                        <div>
                                                            <input
                                                                type="number"
                                                                name="amount"
                                                                defaultValue={pledge
                                                                    .amount}
                                                                className="border rounded p-1 w-full"
                                                            />
                                                        </div>
                                                        <div>
                                                            <button
                                                                type="submit"
                                                                className="bg-blue-600 text-white rounded px-3 py-1"
                                                            >
                                                                Save
                                                            </button>
                                                        </div>
                                                    </form>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>

                {/* Audit Log */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">
                            Audit Log
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr>
                                    <th className="text-left p-4">Time</th>
                                    <th className="text-left p-4">Action</th>
                                    <th className="text-left p-4">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.auditLogs.map((log) => (
                                    <tr
                                        key={log.id}
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="p-4">
                                            {new Date(log.timestamp)
                                                .toLocaleString()}
                                        </td>
                                        <td className="p-4">{log.action}</td>
                                        <td className="p-4">
                                            <details>
                                                <summary>View Changes</summary>
                                                <pre className="mt-2 text-xs whitespace-pre-wrap">
                          {JSON.stringify({
                            previous: log.previousData,
                            new: log.newData
                          }, null, 2)}
                                                </pre>
                                            </details>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
