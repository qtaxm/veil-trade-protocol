import { useNavigate } from "react-router-dom";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Lock, Users, CheckCircle2 } from "lucide-react";
import { useEffect } from "react";

const Welcome = () => {
  const { account, isCorrectNetwork, connectWallet } = useWeb3();
  const navigate = useNavigate();

  useEffect(() => {
    if (account && isCorrectNetwork) {
      navigate("/my-barters");
    }
  }, [account, isCorrectNetwork, navigate]);

  const features = [
    {
      icon: Lock,
      title: "Private Valuations",
      description: "Submit encrypted valuations that remain confidential until both parties are ready"
    },
    {
      icon: Shield,
      title: "Fair Matching",
      description: "Algorithm ensures fair trades within your specified tolerance range"
    },
    {
      icon: Users,
      title: "Direct Peer-to-Peer",
      description: "Match directly with counterparties without intermediaries"
    },
    {
      icon: CheckCircle2,
      title: "Transparent Results",
      description: "Cryptographically verifiable fairness computation on-chain"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-20">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 mb-6 p-2 rounded-full bg-card/50 backdrop-blur-sm border border-border">
            <div className="p-3 rounded-full bg-gradient-primary shadow-glow">
              <Shield className="w-8 h-8" />
            </div>
            <span className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent pr-4">
              VeilSwap
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Privacy-First
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Value Matching
            </span>
          </h1>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Exchange assets fairly with encrypted valuations. VeilSwap ensures both parties agree on value 
            within tolerance, without revealing exact numbers until both commit.
          </p>

          {!account ? (
            <Button 
              size="lg" 
              onClick={connectWallet}
              className="bg-gradient-primary hover:opacity-90 transition-opacity text-lg px-8 py-6 shadow-glow"
            >
              <Shield className="w-5 h-5 mr-2" />
              Connect Wallet to Start
            </Button>
          ) : !isCorrectNetwork ? (
            <Card className="p-6 max-w-md mx-auto bg-destructive/10 border-destructive">
              <p className="text-destructive font-medium">
                Please switch to Sepolia network to continue
              </p>
            </Card>
          ) : null}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="p-6 bg-gradient-card border-border hover:border-primary/50 transition-all hover:shadow-glow"
            >
              <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>

        {/* How It Works */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Create Match", desc: "Set up a barter with counterparty address and tolerance" },
              { step: "2", title: "Submit Valuations", desc: "Both parties submit encrypted valuations privately" },
              { step: "3", title: "Compute Fairness", desc: "Smart contract reveals if values are within tolerance" }
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-lg font-bold mx-auto mb-4 shadow-glow">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
