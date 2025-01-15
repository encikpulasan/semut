// routes/leaderboard.tsx
import { Handlers, PageProps } from "$fresh/server.ts";
import { getTopPledges, getTotalPledged } from "../utils/db.ts";
import type { Pledge } from "../types.ts";

interface LeaderboardData {
  pledges: Pledge[];
  totalAmount: number;
}

export const handler: Handlers<LeaderboardData> = {
  async GET(req, ctx) {
    const accept = req.headers.get("accept");
    if (accept?.includes("text/event-stream")) {
      let controller: ReadableStreamDefaultController;
      let intervalId: number;

      const stream = new ReadableStream({
        start(c) {
          controller = c;
          const sendUpdate = async () => {
            try {
              const pledges = await getTopPledges();
              const totalAmount = await getTotalPledged();
              const data = JSON.stringify({ pledges, totalAmount });
              controller.enqueue(`data: ${data}\n\n`);
            } catch (error) {
              console.error("Error sending update:", error);
            }
          };

          intervalId = setInterval(sendUpdate, 3000);
          sendUpdate();
        },
        cancel() {
          clearInterval(intervalId);
        },
      });

      return new Response(stream.pipeThrough(new TextEncoderStream()), {
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          "connection": "keep-alive",
        },
      });
    }

    // Initialize with empty state if no pledges
    const pledges = await getTopPledges();
    const totalAmount = await getTotalPledged();
    return ctx.render({
      pledges: pledges || [],
      totalAmount: totalAmount || 0,
    });
  },
};

export default function Leaderboard({ data }: PageProps<LeaderboardData>) {
  const pledges = data?.pledges || [];
  const totalAmount = data?.totalAmount || 0;
  const podiumPlaces = pledges.slice(0, 3);
  const otherPlaces = pledges.slice(3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white py-8 overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-48">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 text-transparent bg-clip-text">
            Top Supporters
          </h1>
          <div
            id="total-amount"
            className="text-3xl text-blue-400 font-semibold"
          >
            Total Pledged: RM{totalAmount.toLocaleString()}
          </div>
        </div>

        {/* Podium Section */}
        <div className="flex justify-center items-end mb-20 space-x-4 h-80">
          {/* Second Place */}
          {podiumPlaces[1] && (
            <div className="w-64 text-center">
              <div className="mb-2">
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center border-4 border-gray-300 shadow-lg transform hover:scale-105 transition-transform duration-300">
                  <span className="text-4xl font-bold text-white">2</span>
                </div>
              </div>
              <div className="bg-gray-800 p-4 rounded-t-lg">
                <h3 className="font-bold text-xl">{podiumPlaces[1].name}</h3>
                <p className="text-gray-400 text-sm">
                  {podiumPlaces[1].organization}
                </p>
                <p className="text-2xl text-gray-300">
                  RM{podiumPlaces[1].amount.toLocaleString()}
                </p>
              </div>
              <div className="h-40 bg-gray-700 w-full rounded-b-lg"></div>
            </div>
          )}

          {/* First Place */}
          {podiumPlaces[0] && (
            <div className="w-64 text-center -mt-12">
              <div className="mb-2">
                <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center border-4 border-yellow-400 shadow-lg transform hover:scale-105 transition-transform duration-300">
                  <span className="text-5xl font-bold text-white">1</span>
                </div>
              </div>
              <div className="bg-gray-800 p-4 rounded-t-lg">
                <h3 className="font-bold text-2xl">{podiumPlaces[0].name}</h3>
                <p className="text-gray-400">{podiumPlaces[0].organization}</p>
                <p className="text-3xl font-bold text-yellow-400">
                  RM{podiumPlaces[0].amount.toLocaleString()}
                </p>
              </div>
              <div className="h-48 bg-gray-700 w-full rounded-b-lg"></div>
            </div>
          )}

          {/* Third Place */}
          {podiumPlaces[2] && (
            <div className="w-64 text-center">
              <div className="mb-2">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-700 to-amber-800 flex items-center justify-center border-4 border-amber-700 shadow-lg transform hover:scale-105 transition-transform duration-300">
                  <span className="text-3xl font-bold text-white">3</span>
                </div>
              </div>
              <div className="bg-gray-800 p-4 rounded-t-lg">
                <h3 className="font-bold text-lg">{podiumPlaces[2].name}</h3>
                <p className="text-gray-400 text-sm">
                  {podiumPlaces[2].organization}
                </p>
                <p className="text-xl text-amber-700">
                  RM{podiumPlaces[2].amount.toLocaleString()}
                </p>
              </div>
              <div className="h-32 bg-gray-700 w-full rounded-b-lg"></div>
            </div>
          )}
        </div>

        {/* Other Rankings */}
        <div id="leaderboard" className="space-y-4 mt-8">
          {otherPlaces.map((pledge, index) => (
            <div
              key={pledge.id}
              className="relative bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 transform transition-all duration-1000 hover:bg-gray-700/50 hover:scale-102"
              style={{
                transform: `translateX(${
                  Math.min(
                    (pledge.amount /
                      Math.max(...pledges.map((p) => p.amount))) * 20,
                    20,
                  )
                }%)`,
              }}
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-600/80 backdrop-blur-sm rounded-full flex items-center justify-center text-xl font-bold mr-6">
                  {index + 4}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">
                    {pledge.name}
                    {pledge.organization && (
                      <span className="text-gray-400 ml-2">
                        ({pledge.organization})
                      </span>
                    )}
                  </h3>
                  <div className="text-2xl font-bold text-blue-400">
                    RM{pledge.amount.toLocaleString()}
                  </div>
                </div>
              </div>
              <div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-1000"
                style={{
                  width: `${
                    (pledge.amount /
                      Math.max(...pledges.map((p) => p.amount))) * 100
                  }%`,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        ::-webkit-scrollbar {
          display: none;
        }

        body {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }

        #leaderboard {
          overflow-x: hidden;
        }
      `,
        }}
      />

      <script
        dangerouslySetInnerHTML={{
          __html: `
          const eventSource = new EventSource('/leaderboard');
          let updateInProgress = false;
          
          function updatePodium(pledges) {
            const podiumContainer = document.querySelector('.flex.justify-center.items-end.mb-20');
            if (!podiumContainer) return;

            const podiumPlaces = pledges.slice(0, 3);
            let podiumHTML = '';

            // Second Place
            if (podiumPlaces[1]) {
              podiumHTML += \`
                <div class=" w-64 text-center">
                  <div class="mb-2">
                    <div class="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center border-4 border-gray-300 shadow-lg transform hover:scale-105 transition-transform duration-300">
                      <span class="text-4xl font-bold text-white">2</span>
                    </div>
                  </div>
                  <div class="bg-gray-800 p-4 rounded-t-lg">
                    <h3 class="font-bold text-xl">${podiumPlaces[1].name}</h3>
                    <p class="text-gray-400 text-sm">${
            podiumPlaces[1].organization || ""
          }</p>
                    <p class="text-2xl text-gray-300">RM${
            podiumPlaces[1].amount.toLocaleString()
          }</p>
                  </div>
                  <div class="h-40 bg-gray-700 w-full rounded-b-lg"></div>
                </div>
              \`;
            }

            // First Place
            if (podiumPlaces[0]) {
              podiumHTML += \`
                <div class="w-64 text-center -mt-12">
                  <div class="mb-2">
                    <div class="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center border-4 border-yellow-400 shadow-lg transform hover:scale-105 transition-transform duration-300">
                      <span class="text-5xl font-bold text-white">1</span>
                    </div>
                  </div>
                  <div class="bg-gray-800 p-4 rounded-t-lg">
                    <h3 class="font-bold text-2xl">\${podiumPlaces[0].name}</h3>
                    <p class="text-gray-400">\${podiumPlaces[0].organization || ''}</p>
                    <p class="text-3xl font-bold text-yellow-400">RM\${podiumPlaces[0].amount.toLocaleString()}</p>
                  </div>
                  <div class="h-48 bg-gray-700 w-full rounded-b-lg"></div>
                </div>
              \`;
            }

            // Third Place
            if (podiumPlaces[2]) {
              podiumHTML += \`
                <div class="w-64 text-center">
                  <div class="mb-2">
                    <div class="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-700 to-amber-800 flex items-center justify-center border-4 border-amber-700 shadow-lg transform hover:scale-105 transition-transform duration-300">
                      <span class="text-3xl font-bold text-white">3</span>
                    </div>
                  </div>
                  <div class="bg-gray-800 p-4 rounded-t-lg">
                    <h3 class="font-bold text-lg">\${podiumPlaces[2].name}</h3>
                    <p class="text-gray-400 text-sm">\${podiumPlaces[2].organization || ''}</p>
                    <p class="text-xl text-amber-700">RM\${podiumPlaces[2].amount.toLocaleString()}</p>
                  </div>
                  <div class="h-32 bg-gray-700 w-full rounded-b-lg"></div>
                </div>
              \`;
            }

            podiumContainer.innerHTML = podiumHTML;
          }

          eventSource.onmessage = (e) => {
            if (updateInProgress) return;
            updateInProgress = true;
            
            try {
              const { pledges, totalAmount } = JSON.parse(e.data);
              if (!pledges || !Array.isArray(pledges)) return;
              
              // Update total amount with animation
              const totalEl = document.getElementById('total-amount');
              if (totalEl) {
                totalEl.style.animation = 'pulse 0.5s ease-in-out';
                totalEl.textContent = 'Total Pledged: RM' + (totalAmount || 0).toLocaleString();
                totalEl.addEventListener('animationend', () => {
                  totalEl.style.animation = '';
                });
              }

              // Update podium
              updatePodium(pledges);

              // Update leaderboard with debounce
              const leaderboard = document.getElementById('leaderboard');
              if (!leaderboard) return;

              requestAnimationFrame(() => {
                const maxAmount = Math.max(...pledges.map(p => p.amount));
                const otherPlaces = pledges.slice(3);
                
                leaderboard.innerHTML = otherPlaces.map((pledge, index) => {
                  const percentWidth = (pledge.amount / maxAmount) * 100;
                  const translateX = Math.min((pledge.amount / maxAmount) * 20, 20);
                  
                  return \`
                    <div
                      class="relative bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 transform transition-all duration-1000 hover:bg-gray-700/50 hover:scale-102"
                      style="transform: translateX(\${translateX}%)"
                    >
                      <div class="flex items-center">
                        <div class="w-12 h-12 bg-blue-600/80 backdrop-blur-sm rounded-full flex items-center justify-center text-xl font-bold mr-6">
                          \${index + 4}
                        </div>
                        <div class="flex-1">
                          <h3 class="text-xl font-semibold">
                            \${pledge.name}
                            \${pledge.organization ? 
                              \`<span class="text-gray-400 ml-2">(\${pledge.organization})</span>\` : 
                              ''}
                          </h3>
                          <div class="text-2xl font-bold text-blue-400">
                            RM\${pledge.amount.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div
                        class="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-1000"
                        style="width: \${percentWidth}%"
                      ></div>
                    </div>
                  \`;
                }).join('');
                
                updateInProgress = false;
              });
            } catch (error) {
              console.error('Error updating leaderboard:', error);
              updateInProgress = false;
            }
          };

          eventSource.onerror = (error) => {
            console.error('EventSource error:', error);
            eventSource.close();
            setTimeout(() => {
              window.location.reload();
            }, 5000);
          };

          window.addEventListener('unload', () => {
            eventSource.close();
          });
        `,
        }}
      />
    </div>
  );
}
