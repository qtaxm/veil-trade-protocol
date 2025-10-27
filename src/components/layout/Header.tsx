import { Link } from "react-router-dom";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Shield, Wallet, LogOut } from "lucide-react";

const Header = () => {
  const { account, contractVersion, isCorrectNetwork, connectWallet, disconnectWallet } = useWeb3();

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-lg bg-gradient-primary shadow-glow">
              <Shield className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              VeilSwap
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            {account && (
              <>
                <Link to="/create" className="text-sm hover:text-primary transition-colors">
                  Create Barter
                </Link>
                <Link to="/my-barters" className="text-sm hover:text-primary transition-colors">
                  My Barters
                </Link>
              </>
            )}

            <div className="flex items-center gap-3">
              {account ? (
                <>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${isCorrectNetwork ? 'bg-success' : 'bg-destructive'}`} />
                      <span className="text-muted-foreground">
                        {account.slice(0, 6)}...{account.slice(-4)}
                      </span>
                    </div>
                    {contractVersion && (
                      <span className="text-xs text-muted-foreground">
                        v{contractVersion}
                      </span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={disconnectWallet}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button onClick={connectWallet} className="bg-gradient-primary hover:opacity-90 transition-opacity">
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
