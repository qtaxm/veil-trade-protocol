import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

const CreateBarter = () => {
  const { contract, account } = useWeb3();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    partyB: "",
    tolBps: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contract || !account) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    // Validate inputs
    if (!formData.partyB.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast({
        title: "Invalid address",
        description: "Please enter a valid Ethereum address",
        variant: "destructive"
      });
      return;
    }

    // Check if counterparty is the same as the current account
    if (formData.partyB.toLowerCase() === account.toLowerCase()) {
      toast({
        title: "Invalid counterparty",
        description: "You cannot create a barter with yourself. Please enter a different address.",
        variant: "destructive"
      });
      return;
    }

    const tolBps = parseInt(formData.tolBps);
    if (isNaN(tolBps) || tolBps < 0 || tolBps > 10000) {
      toast({
        title: "Invalid tolerance",
        description: "Tolerance must be between 0 and 10000 bps",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const tx = await contract.createBarter(formData.partyB, tolBps);
      const receipt = await tx.wait();

      // Extract barter ID from BarterCreated event
      // Event signature: BarterCreated(uint256 indexed id, address indexed partyA, address indexed partyB, uint16 tolBps)
      let barterId = "0";

      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog({
            topics: [...log.topics],
            data: log.data
          });

          if (parsedLog && parsedLog.name === "BarterCreated") {
            barterId = parsedLog.args.id.toString();
            break;
          }
        } catch (e) {
          // Skip logs that don't match our contract
          continue;
        }
      }

      toast({
        title: "Barter created successfully!",
        description: `Barter ID: ${barterId}`
      });

      // Navigate to the barter detail page
      navigate(`/barter/${barterId}`);
    } catch (error: any) {
      console.error("Error creating barter:", error);
      toast({
        title: "Transaction failed",
        description: error.message || "Failed to create barter",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero py-20">
      <div className="container mx-auto px-4 max-w-2xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="p-8 bg-gradient-card border-border shadow-card">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Create New Barter</h1>
            <p className="text-muted-foreground">
              Set up a new private value matching with a counterparty
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="partyB">Counterparty Address</Label>
              <Input
                id="partyB"
                placeholder="0x..."
                value={formData.partyB}
                onChange={(e) => setFormData({ ...formData, partyB: e.target.value })}
                className="bg-background/50 border-border"
                required
              />
              <p className="text-xs text-muted-foreground">
                The Ethereum address of the other party (cannot be your own address)
              </p>
              {account && formData.partyB && formData.partyB.toLowerCase() === account.toLowerCase() && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <span>⚠</span> Cannot create a barter with yourself
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tolBps">Tolerance (bps)</Label>
              <Input
                id="tolBps"
                type="number"
                min="0"
                max="10000"
                placeholder="100"
                value={formData.tolBps}
                onChange={(e) => setFormData({ ...formData, tolBps: e.target.value })}
                className="bg-background/50 border-border"
                required
              />
              <p className="text-xs text-muted-foreground">
                Acceptable difference in basis points (1% = 100 bps). Range: 0-10000
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-sm">How tolerance works:</h3>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>100 bps = 1% tolerance between valuations</li>
                <li>500 bps = 5% tolerance between valuations</li>
                <li>Lower values require closer agreement</li>
                <li>Both parties see same fairness result</li>
              </ul>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Barter...
                </>
              ) : (
                "Create Barter"
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CreateBarter;
