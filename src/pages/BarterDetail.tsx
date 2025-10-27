import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWeb3 } from "@/contexts/Web3Context";
import { useFHE } from "@/contexts/FHEContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { encryptValuation, parseValuationInput, FHE_ERRORS } from "@/lib/fheUtils";
import {
  ArrowLeft,
  Users,
  Percent,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Calculator,
  Copy,
  Loader2,
  Shield
} from "lucide-react";

interface Barter {
  id: string;
  partyA: string;
  partyB: string;
  tolBps: number;
  hasA: boolean;
  hasB: boolean;
  hasResult: boolean;
  canceled: boolean;
  result?: boolean;
}

const BarterDetail = () => {
  const { id } = useParams();
  const { contract, account } = useWeb3();
  const { createEncryptedInput, isInitialized, isInitializing, error: fheError } = useFHE();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [barter, setBarter] = useState<Barter | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [valuation, setValuation] = useState("");
  const [decrypting, setDecrypting] = useState(false);

  useEffect(() => {
    const fetchBarterData = async () => {
      if (!contract || !id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch barter info from contract
        const barterInfo = await contract.getBarterInfo(id);

        const barterData: Barter = {
          id: id,
          partyA: barterInfo[0],
          partyB: barterInfo[1],
          tolBps: Number(barterInfo[2]),
          hasA: barterInfo[3],
          hasB: barterInfo[4],
          hasResult: barterInfo[5],
          canceled: barterInfo[6]
        };

        // If result exists, try to decrypt it
        if (barterData.hasResult && isInitialized && account) {
          try {
            const resultHandle = await contract.getResultHandle(id);
            const contractAddress = await contract.getAddress();

            // Decrypt the ebool result
            const fairResult = await decryptBool(resultHandle, contractAddress);
            if (fairResult !== null) {
              barterData.result = fairResult;
            }
          } catch (error) {
            console.error('Failed to decrypt result:', error);
          }
        }

        setBarter(barterData);
      } catch (error) {
        console.error('Error fetching barter:', error);
        toast({
          title: "Error loading barter",
          description: "Could not load barter data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBarterData();
  }, [id, contract, account, isInitialized]);

  const isPartyA = barter?.partyA.toLowerCase() === account?.toLowerCase();
  const isPartyB = barter?.partyB.toLowerCase() === account?.toLowerCase();
  const canSubmit = barter && !barter.canceled && !barter.hasResult;
  const hasSubmitted = isPartyA ? barter?.hasA : barter?.hasB;
  const canCompute = barter?.hasA && barter?.hasB && !barter?.hasResult;
  const canCancel = barter && !barter.hasResult && !barter.canceled;

  const handleSubmitValuation = async () => {
    if (!contract || !barter || !valuation || !account) {
      toast({
        title: "Cannot submit",
        description: FHE_ERRORS.WALLET_NOT_CONNECTED,
        variant: "destructive"
      });
      return;
    }

    if (!isInitialized) {
      toast({
        title: "FHE not ready",
        description: FHE_ERRORS.NOT_INITIALIZED,
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: Parse and validate the input
      const valuationBigInt = parseValuationInput(valuation);

      // Step 2: Create encrypted input for this contract and user
      const contractAddress = await contract.getAddress();
      console.log('[Debug] Contract address from contract.getAddress():', contractAddress);
      console.log('[Debug] User account address:', account);

      const input = createEncryptedInput(contractAddress, account);

      if (!input) {
        throw new Error(FHE_ERRORS.ENCRYPTION_FAILED);
      }

      // Step 3: Encrypt the valuation (generates handle + ZK proof)
      toast({
        title: "Encrypting valuation...",
        description: "Generating zero-knowledge proof"
      });

      const { handle, inputProof } = await encryptValuation(input, valuationBigInt);

      // Debug logging - check all values before submission
      console.log('[Debug] === Pre-submission Debug Info ===');
      console.log('[Debug] Barter ID:', barter.id);
      console.log('[Debug] Barter ID type:', typeof barter.id);
      console.log('[Debug] Handle:', handle);
      console.log('[Debug] Handle type:', typeof handle);
      console.log('[Debug] Handle length:', typeof handle === 'string' ? handle.length : 'N/A (not a string)');
      console.log('[Debug] Handle starts with 0x:', typeof handle === 'string' ? handle.startsWith('0x') : 'N/A (not a string)');
      console.log('[Debug] InputProof:', typeof inputProof === 'string' ? (inputProof.substring(0, 50) + '...') : inputProof);
      console.log('[Debug] InputProof type:', typeof inputProof);
      console.log('[Debug] InputProof length:', typeof inputProof === 'string' ? inputProof.length : (Array.isArray(inputProof) ? inputProof.length : 'N/A'));
      console.log('[Debug] InputProof starts with 0x:', typeof inputProof === 'string' ? inputProof.startsWith('0x') : 'N/A (not a string)');
      console.log('[Debug] Current account:', account);
      console.log('[Debug] Barter partyA:', barter.partyA);
      console.log('[Debug] Barter partyB:', barter.partyB);
      console.log('[Debug] Is participant:',
        account.toLowerCase() === barter.partyA.toLowerCase() ||
        account.toLowerCase() === barter.partyB.toLowerCase()
      );
      console.log('[Debug] Barter state:', {
        hasA: barter.hasA,
        hasB: barter.hasB,
        hasResult: barter.hasResult,
        canceled: barter.canceled
      });
      console.log('[Debug] Can submit:', canSubmit);
      console.log('[Debug] Has submitted:', hasSubmitted);

      // Step 4: Format handle for contract
      // externalEuint64 is defined as bytes32 in Solidity
      // Pass handle directly (Uint8Array will be converted by ethers.js)
      const valExt = handle; // bytes32 type, not a tuple

      console.log('[Debug] Final valExt:', valExt);
      console.log('[Debug] Contract address:', contractAddress);

      // Step 5: Verify contract state before submission
      console.log('[Debug] Verifying contract state...');
      const currentBarterInfo = await contract.getBarterInfo(barter.id);
      console.log('[Debug] Current barter info from contract:', {
        partyA: currentBarterInfo[0],
        partyB: currentBarterInfo[1],
        tolBps: currentBarterInfo[2].toString(),
        hasA: currentBarterInfo[3],
        hasB: currentBarterInfo[4],
        hasResult: currentBarterInfo[5],
        canceled: currentBarterInfo[6]
      });

      //Step 6: Try staticCall first to get better error message
      try {
        console.log('[Debug] Testing with staticCall first...');
        await contract.submitValuation.staticCall(barter.id, valExt, inputProof);
        console.log('[Debug] staticCall succeeded, proceeding with actual transaction');
      } catch (staticError: any) {
        console.error('[Debug] staticCall failed:', staticError);
        if (staticError.reason) {
          console.error('[Debug] Revert reason:', staticError.reason);
        }
        if (staticError.data) {
          console.error('[Debug] Error data:', staticError.data);
        }

        // Provide more helpful error message
        let errorMsg = 'Contract validation failed';
        if (staticError.message && staticError.message.includes('missing revert data')) {
          errorMsg = 'Proof validation failed. This may be due to: (1) KMS/ACL system issue, (2) incorrect contract address in encrypted input, or (3) Relayer service issue. Please try again or check network configuration.';
        } else if (staticError.reason) {
          errorMsg = `Contract error: ${staticError.reason}`;
        }

        throw new Error(errorMsg);
      }

      // Step 6: Submit to contract
      toast({
        title: "Submitting to contract...",
        description: "Please confirm the transaction"
      });

      const tx = await contract.submitValuation(barter.id, valExt, inputProof);

      toast({
        title: "Transaction sent",
        description: "Waiting for confirmation..."
      });

      await tx.wait();

      toast({
        title: "Valuation submitted successfully!",
        description: "Your encrypted valuation has been recorded"
      });

      // Refresh barter data
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      console.error("Error submitting valuation:", error);

      let errorMessage = "Failed to submit valuation";
      if (error.message.includes("user rejected")) {
        errorMessage = "Transaction was rejected";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Submission failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompute = async () => {
    if (!contract || !barter) return;

    setSubmitting(true);
    try {
      const tx = await contract.computeFairness(barter.id);
      await tx.wait();

      toast({
        title: "Fairness computed!",
        description: "Check the result below"
      });

      window.location.reload();
    } catch (error: any) {
      console.error("Error computing fairness:", error);
      toast({
        title: "Computation failed",
        description: error.message || "Failed to compute fairness",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!contract || !barter) return;

    setSubmitting(true);
    try {
      const tx = await contract.cancel(barter.id);
      await tx.wait();

      toast({
        title: "Barter canceled",
        description: "This barter has been canceled"
      });

      navigate("/my-barters");
    } catch (error: any) {
      console.error("Error canceling barter:", error);
      toast({
        title: "Cancellation failed",
        description: error.message || "Failed to cancel barter",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyInviteLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied!",
      description: "Share this link with your counterparty"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!barter) {
    return (
      <div className="min-h-screen bg-gradient-hero py-20">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <Card className="p-12">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Barter Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The barter you're looking for doesn't exist
            </p>
            <Button onClick={() => navigate("/my-barters")}>
              View My Barters
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero py-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Status Banner */}
        <Card className="p-4 mb-6 bg-gradient-card border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-primary">#{barter.id}</div>
              {barter.canceled ? (
                <Badge className="bg-muted text-foreground">Canceled</Badge>
              ) : barter.hasResult ? (
                <Badge className="bg-success text-foreground">Completed</Badge>
              ) : (
                <Badge className="bg-accent text-foreground">Ongoing</Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={copyInviteLink}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Invite Link
            </Button>
          </div>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card className="p-6 bg-gradient-card border-border">
              <h2 className="text-xl font-bold mb-4">Barter Information</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Party A</p>
                    <p className="font-mono text-sm">{barter.partyA}</p>
                  </div>
                  {barter.hasA && <CheckCircle2 className="w-5 h-5 text-success" />}
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Party B</p>
                    <p className="font-mono text-sm">{barter.partyB}</p>
                  </div>
                  {barter.hasB && <CheckCircle2 className="w-5 h-5 text-success" />}
                </div>
                <div className="flex items-center gap-3">
                  <Percent className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tolerance</p>
                    <p className="font-semibold">{barter.tolBps / 100}% ({barter.tolBps} bps)</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Result Display */}
            {barter.hasResult && (
              <Card className="p-6 bg-gradient-card border-border">
                <h2 className="text-xl font-bold mb-4">Fairness Result</h2>
                <div className={`p-6 rounded-lg border-2 ${
                  barter.result 
                    ? 'bg-success/10 border-success' 
                    : 'bg-destructive/10 border-destructive'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    {barter.result ? (
                      <>
                        <CheckCircle2 className="w-6 h-6 text-success" />
                        <span className="text-lg font-semibold text-success">Fair Match</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-6 h-6 text-destructive" />
                        <span className="text-lg font-semibold text-destructive">Not Fair</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {barter.result 
                      ? "Valuations are within the specified tolerance"
                      : "Valuations differ by more than the tolerance"}
                  </p>
                </div>
              </Card>
            )}

            {/* Timeline */}
            <Card className="p-6 bg-gradient-card border-border">
              <h2 className="text-xl font-bold mb-4">Timeline</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Barter Created</p>
                    <p className="text-sm text-muted-foreground">Initial setup completed</p>
                  </div>
                </div>
                {barter.hasA && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-success/10">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    </div>
                    <div>
                      <p className="font-semibold">Party A Submitted</p>
                      <p className="text-sm text-muted-foreground">Encrypted valuation recorded</p>
                    </div>
                  </div>
                )}
                {barter.hasB && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-success/10">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    </div>
                    <div>
                      <p className="font-semibold">Party B Submitted</p>
                      <p className="text-sm text-muted-foreground">Encrypted valuation recorded</p>
                    </div>
                  </div>
                )}
                {barter.hasResult && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Calculator className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Fairness Computed</p>
                      <p className="text-sm text-muted-foreground">Result available</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            {/* Submit Valuation */}
            {canSubmit && !hasSubmitted && (isPartyA || isPartyB) && (
              <Card className="p-6 bg-gradient-card border-border">
                <h3 className="text-lg font-semibold mb-4">Submit Your Valuation</h3>
                <div className="space-y-4">
                  {/* FHE Status Indicator */}
                  {isInitializing && (
                    <div className="p-3 rounded-lg bg-accent/50 border border-border flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm">Initializing encryption system...</span>
                    </div>
                  )}
                  {fheError && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive text-sm">
                      <p className="font-semibold text-destructive mb-1">FHE Initialization Error</p>
                      <p className="text-xs">{fheError}</p>
                      <p className="text-xs mt-2">Try refreshing the page</p>
                    </div>
                  )}
                  {!isInitializing && !fheError && !isInitialized && (
                    <div className="p-3 rounded-lg bg-accent/50 border border-border flex items-center gap-2">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Encryption system loading...</span>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="valuation">Encrypted Value</Label>
                    <Input
                      id="valuation"
                      type="number"
                      placeholder="Enter your valuation"
                      value={valuation}
                      onChange={(e) => setValuation(e.target.value)}
                      className="bg-background/50"
                      disabled={!isInitialized}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This value will be encrypted before submission
                    </p>
                  </div>
                  <Button
                    className="w-full bg-gradient-primary hover:opacity-90"
                    onClick={handleSubmitValuation}
                    disabled={submitting || !valuation || !isInitialized}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : !isInitialized ? (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Waiting for encryption...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Valuation
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )}

            {/* Compute Fairness */}
            {canCompute && (
              <Card className="p-6 bg-gradient-card border-border">
                <h3 className="text-lg font-semibold mb-4">Compute Result</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Both parties have submitted. Click to compute fairness.
                </p>
                <Button 
                  className="w-full bg-gradient-primary hover:opacity-90"
                  onClick={handleCompute}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Computing...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4 mr-2" />
                      Compute Fairness
                    </>
                  )}
                </Button>
              </Card>
            )}

            {/* Cancel */}
            {canCancel && (isPartyA || isPartyB) && (
              <Card className="p-6 bg-gradient-card border-border">
                <h3 className="text-lg font-semibold mb-4">Cancel Barter</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Cancel this barter before computation
                </p>
                <Button 
                  variant="destructive"
                  className="w-full"
                  onClick={handleCancel}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Canceling...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Barter
                    </>
                  )}
                </Button>
              </Card>
            )}

            {/* Status Card */}
            <Card className="p-6 bg-gradient-card border-border">
              <h3 className="text-lg font-semibold mb-4">Your Role</h3>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  You are: <span className="font-semibold text-foreground">
                    {isPartyA ? "Party A" : isPartyB ? "Party B" : "Observer"}
                  </span>
                </p>
                {hasSubmitted && (
                  <p className="text-success flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    You have submitted your valuation
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarterDetail;
