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
          <div class="w-32 h-32 mx-auto bg-[rgb(247,247,247)] shadow-lg rounded-full overflow-hidden">
            <img
              class="w-32 h-32 mt-1"
              src="https://scontent.fkul4-4.fna.fbcdn.net/v/t39.30808-6/272446542_126415173207768_4664783751978214270_n.jpg?_nc_cat=102&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=SPpKc8a3fAMQ7kNvgG_Kgf9&_nc_oc=AdjYvL_jP_4wdX15lHQ7JQPwxR1VlyJVYZIu3Opd3d6jBBDG7DF6J0wmfQ6c0kpGXd8&_nc_zt=23&_nc_ht=scontent.fkul4-4.fna&_nc_gid=AF9gp8if8qB2igZcZwkzuph&oh=00_AYBYzGQVOxzdski29Y4kuglVJSDCXfF7321u70wZjT4w1A&oe=67C089C6"
              alt="#AnakTBQ"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {existingPledge
              ? "Ikrar Bantuan Kepada #AnakTBQ"
              : "Ikrar Bantuan Kepada #AnakTBQ"}
          </h1>
          {existingPledge && (
            <div className="mt-2 text-2xl text-gray-600">
              Ikrar Saya:{" "}
              <span className="text-green-500 font-bold">
                RM{existingPledge.amount.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
            {existingPledge
              ? "Terima Kasih, Ikrar berjaya dikemaskini!"
              : "Terima Kasih, Ikrar berjaya direkodkan!"}
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
                Nama
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
                Organisasi (Jika ada)
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
                Jumlah Ikrar (RM)
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
                  Ikrar Terkini Saya: RM{existingPledge.amount.toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                No. Telefon
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
                Alamat Emel
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

            <div class="flex items-center p-4 border border-gray-200 rounded-md">
              <input
                id="ikrar"
                type="checkbox"
                value=""
                name="ikrar"
                class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-200 rounded-md focus:ring-blue-500 focus:ring-2 focus:rounded-md"
              />
              <label
                for="ikrar"
                class="w-full ms-4 text-sm font-medium text-gray-700"
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
              {existingPledge ? "Kemaskini Ikrar" : "Hantar Ikrar"}
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
