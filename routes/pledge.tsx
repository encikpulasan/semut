// routes/pledge.tsx
import { Handlers, PageProps } from "$fresh/server.ts";
import { getPledgeBySession, savePledge } from "../utils/db.ts";
import type { Pledge } from "../types.ts";

interface PledgePageData {
  existingPledge?: Pledge;
  success?: boolean;
  error?: string;
}

export const handler: Handlers<PledgePageData> = {
  async GET(req, ctx) {
    const sessionId = ctx.state.sessionId;
    const url = new URL(req.url);
    const success = url.searchParams.get("success") === "true";
    const error = url.searchParams.get("error");

    try {
      const existingPledge = await getPledgeBySession(sessionId);
      return ctx.render({ existingPledge, success, error });
    } catch (err) {
      console.error("Error fetching pledge:", err);
      return ctx.render({ error: "Failed to load pledge data" });
    }
  },

  async POST(req, ctx) {
    const sessionId = ctx.state.sessionId;

    try {
      const formData = await req.formData();
      const pledge: Pledge = {
        name: formData.get("name") as string,
        organization: formData.get("organization") as string || undefined,
        amount: Number(formData.get("amount")),
        phone: formData.get("phone") as string,
        email: formData.get("email") as string,
      };

      await savePledge(pledge, sessionId);
      return new Response(null, {
        status: 303,
        headers: { Location: "/pledge?success=true" },
      });
    } catch (error) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/pledge?error=Failed+to+save+pledge" },
      });
    }
  },
};

export default function PledgePage({ data }: PageProps<PledgePageData>) {
  const { existingPledge, success, error } = data;

  return (
    <div
      className="bg-repeat bg-center min-h-screen bg-gray-50 py-12 px-4"
      style="background-image: linear-gradient(rgba(255,255,255,0.5), rgba(255,255,255,0.5)), url(https://img.freepik.com/free-vector/light-colors-ornamental-pattern-background_1268-794.jpg);"
    >
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {existingPledge
              ? "Modify Your Pledge"
              : "Support Children's Home Shelter"}
          </h1>
          {existingPledge && (
            <div className="mt-2 text-gray-600">
              Your current pledge: RM{existingPledge.amount.toLocaleString()}
            </div>
          )}
        </div>

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
            {existingPledge
              ? "Pledge updated successfully!"
              : "Thank you for your pledge!"}
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {error}
          </div>
        )}

        <form method="POST" className="bg-white p-8 rounded-lg shadow">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                name="name"
                value={existingPledge?.name}
                className="mt-1 w-full p-3 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Organization (Optional)
              </label>
              <input
                type="text"
                name="organization"
                value={existingPledge?.organization}
                className="mt-1 w-full p-3 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Pledge Amount (RM)
              </label>
              <input
                type="number"
                name="amount"
                value={existingPledge?.amount}
                className="mt-1 w-full p-3 border rounded-md"
                required
                min="1"
              />
              {existingPledge && (
                <p className="mt-1 text-sm text-gray-500">
                  Previous amount: RM{existingPledge.amount.toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="phone"
                name="phone"
                value={existingPledge?.phone}
                className="mt-1 w-full p-3 border rounded-md"
                required
                readOnly={!!existingPledge}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={existingPledge?.email}
                className="mt-1 w-full p-3 border rounded-md"
                required
                readOnly={!!existingPledge}
              />
            </div>

            <div class="flex items-center ps-4 border border-gray-200 rounded-md">
              <input
                id="ikrar"
                type="checkbox"
                value=""
                name="ikrar"
                class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-200 rounded-md focus:ring-blue-500 focus:ring-2 focus:rounded-md"
              />
              <label
                for="ikrar"
                class="w-full py-4 ms-4 text-sm font-medium text-gray-700"
              >
                Dengan lafaz Bismillah, saya berikrar untuk menyumbangkan jumlah
                yang dinyatakan diatas kepada Rumah Perlindungan Kanak-kanak TBQ
                Amal. Lillahi Ta'ala.
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition duration-150"
            >
              {existingPledge ? "Update Pledge" : "Submit Pledge"}
            </button>
          </div>
        </form>

        {existingPledge?.history && existingPledge.history.length > 1 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Pledge History</h2>
            <div className="bg-white p-4 rounded-lg shadow">
              {existingPledge.history.map((record, index) => (
                <div
                  key={record.timestamp}
                  className="flex justify-between py-2"
                >
                  <div className="text-gray-600">
                    {new Date(record.timestamp).toLocaleDateString()}
                  </div>
                  <div className={index === 0 ? "font-bold" : ""}>
                    ${record.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
