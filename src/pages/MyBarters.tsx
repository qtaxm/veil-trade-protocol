import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink } from "lucide-react";

interface Barter {
  id: string;
  partyA: string;
  partyB: string;
  tolBps: number;
  hasA: boolean;
  hasB: boolean;
  hasResult: boolean;
  canceled: boolean;
}

const MyBarters = () => {
  const { contract, account } = useWeb3();
  const navigate = useNavigate();
  const [barters, setBarters] = useState<Barter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBarters = async () => {
      if (!contract || !account) {
        setLoading(false);
        return;
      }

      try {
        // Get total number of barters
        const barterCount = await contract.barterCount();
        const totalBarters = Number(barterCount);

        if (totalBarters === 0) {
          setBarters([]);
          setLoading(false);
          return;
        }

        // Fetch all barters and filter by user involvement
        const barterPromises: Promise<Barter | null>[] = [];

        for (let i = 0; i < totalBarters; i++) {
          barterPromises.push(
            (async () => {
              try {
                const barterInfo = await contract.getBarterInfo(i);
                const [partyA, partyB, tolBps, hasA, hasB, hasResult, canceled] = barterInfo;

                // Only include barters where user is partyA or partyB
                if (
                  partyA.toLowerCase() === account.toLowerCase() ||
                  partyB.toLowerCase() === account.toLowerCase()
                ) {
                  return {
                    id: i.toString(),
                    partyA: `${partyA.slice(0, 6)}...${partyA.slice(-4)}`,
                    partyB: `${partyB.slice(0, 6)}...${partyB.slice(-4)}`,
                    tolBps: Number(tolBps),
                    hasA,
                    hasB,
                    hasResult,
                    canceled
                  };
                }
                return null;
              } catch (error) {
                console.error(`Error fetching barter ${i}:`, error);
                return null;
              }
            })()
          );
        }

        const results = await Promise.all(barterPromises);
        const userBarters = results.filter((b): b is Barter => b !== null);

        setBarters(userBarters);
      } catch (error) {
        console.error("Error fetching barters:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBarters();
  }, [contract, account]);

  const getStatus = (barter: Barter) => {
    if (barter.canceled) return "canceled";
    if (barter.hasResult) return "completed";
    return "ongoing";
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; text: string }> = {
      ongoing: { color: "bg-accent", text: "Ongoing" },
      completed: { color: "bg-success", text: "Completed" },
      canceled: { color: "bg-muted", text: "Canceled" }
    };

    const { color, text } = variants[status];
    return (
      <Badge className={`${color} text-foreground`}>
        {text}
      </Badge>
    );
  };

  const filterBarters = (status: string) => {
    return barters.filter(b => getStatus(b) === status);
  };

  const BarterCard = ({ barter }: { barter: Barter }) => (
    <Card 
      className="p-6 bg-gradient-card border-border hover:border-primary/50 transition-all cursor-pointer"
      onClick={() => navigate(`/barter/${barter.id}`)}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">Barter #{barter.id}</h3>
          <p className="text-sm text-muted-foreground">
            Tolerance: {barter.tolBps / 100}%
          </p>
        </div>
        {getStatusBadge(getStatus(barter))}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Party A:</span>
          <span className="font-mono">{barter.partyA}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Party B:</span>
          <span className="font-mono">{barter.partyB}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Valuations:</span>
          <span>
            {barter.hasA ? "✓" : "○"} A / {barter.hasB ? "✓" : "○"} B
          </span>
        </div>
      </div>

      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full mt-4"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/barter/${barter.id}`);
        }}
      >
        View Details
        <ExternalLink className="w-4 h-4 ml-2" />
      </Button>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-hero py-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Barters</h1>
            <p className="text-muted-foreground">
              Manage your active and completed barter matches
            </p>
          </div>
          <Button 
            onClick={() => navigate("/create")}
            className="bg-gradient-primary hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New
          </Button>
        </div>

        <Tabs defaultValue="ongoing" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="ongoing">
              Ongoing ({filterBarters("ongoing").length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({filterBarters("completed").length})
            </TabsTrigger>
            <TabsTrigger value="canceled">
              Canceled ({filterBarters("canceled").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ongoing" className="space-y-4">
            {loading ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">Loading barters...</p>
              </Card>
            ) : filterBarters("ongoing").length === 0 ? (
              <Card className="p-12 text-center bg-gradient-card">
                <p className="text-muted-foreground mb-4">No ongoing barters</p>
                <Button onClick={() => navigate("/create")}>
                  Create Your First Barter
                </Button>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {filterBarters("ongoing").map(barter => (
                  <BarterCard key={barter.id} barter={barter} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {filterBarters("completed").length === 0 ? (
              <Card className="p-12 text-center bg-gradient-card">
                <p className="text-muted-foreground">No completed barters</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {filterBarters("completed").map(barter => (
                  <BarterCard key={barter.id} barter={barter} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="canceled" className="space-y-4">
            {filterBarters("canceled").length === 0 ? (
              <Card className="p-12 text-center bg-gradient-card">
                <p className="text-muted-foreground">No canceled barters</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {filterBarters("canceled").map(barter => (
                  <BarterCard key={barter.id} barter={barter} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MyBarters;
