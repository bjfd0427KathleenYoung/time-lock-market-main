/**
 * FHEVM 0.9 Example: Create Encrypted Time Offer
 * Demonstrates complete encryption workflow
 */

import { useState } from 'react';
import { BrowserProvider, Contract, parseEther } from 'ethers';
import { useEncrypt } from '@/hooks/useFHE';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

// Contract ABI (only the function we need)
const CONTRACT_ABI = [
  {
    "inputs": [
      { "name": "_title", "type": "string" },
      { "name": "_description", "type": "string" },
      { "name": "_publicPrice", "type": "uint256" },
      { "name": "_duration", "type": "uint256" },
      { "name": "_slots", "type": "uint256" },
      { "name": "_encryptedPrice", "type": "externalEuint64" },
      { "name": "_encryptedDuration", "type": "externalEuint32" },
      { "name": "_encryptedSlots", "type": "externalEuint32" },
      { "name": "inputProof", "type": "bytes" }
    ],
    "name": "createOfferWithFHE",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// â­ Replace with your deployed contract address
const CONTRACT_ADDRESS = "0xYourContractAddressHere";

export function CreateOfferFHE() {
  const { toast } = useToast();
  const { encryptBatch, isEncrypting } = useEncrypt();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [slots, setSlots] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * â­ FHEVM 0.9: Complete Encrypted Offer Creation
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !price || !duration || !slots) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Connect wallet
      if (!window.ethereum) {
        throw new Error('No wallet detected');
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      console.log('[CreateOffer] User address:', userAddress);

      // Step 2: Parse values
      const priceWei = parseEther(price); // Convert to wei
      const durationDays = parseInt(duration);
      const slotsCount = parseInt(slots);

      console.log('[CreateOffer] Values:', {
        priceWei: priceWei.toString(),
        durationDays,
        slotsCount
      });

      // â­ Step 3: Encrypt all sensitive data in ONE call (shared proof)
      console.log('[CreateOffer] Starting encryption...');

      const { handles, proof } = await encryptBatch(
        CONTRACT_ADDRESS,
        userAddress,
        [
          { value: priceWei, type: 'uint64' },      // handles[0] = encrypted price
          { value: durationDays, type: 'uint32' },  // handles[1] = encrypted duration
          { value: slotsCount, type: 'uint32' }     // handles[2] = encrypted slots
        ]
      );

      console.log('[CreateOffer] Encryption complete â
');
      console.log('[CreateOffer] Handles:', handles);
      console.log('[CreateOffer] Proof length:', proof.length);

      // Step 4: Create contract instance
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // â­ Step 5: Call contract with encrypted data
      console.log('[CreateOffer] Calling contract...');

      const tx = await contract.createOfferWithFHE(
        title,               // string _title
        description,         // string _description
        priceWei,            // uint256 _publicPrice (for display)
        durationDays,        // uint256 _duration (public)
        slotsCount,          // uint256 _slots (public)
        handles[0],          // externalEuint64 _encryptedPrice â­
        handles[1],          // externalEuint32 _encryptedDuration â­
        handles[2],          // externalEuint32 _encryptedSlots â­
        proof                // bytes inputProof â­ (shared proof for all 3)
      );

      console.log('[CreateOffer] Transaction sent:', tx.hash);

      toast({
        title: "Transaction Submitted",
        description: `Waiting for confirmation... TX: ${tx.hash.slice(0, 10)}...`
      });

      // Step 6: Wait for confirmation
      const receipt = await tx.wait();

      console.log('[CreateOffer] Transaction confirmed â
', receipt);

      toast({
        title: "Success! â
",
        description: `Offer created with encrypted pricing. Block: ${receipt.blockNumber}`,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setPrice('');
      setDuration('');
      setSlots('');

    } catch (error: any) {
      console.error('[CreateOffer] Error:', error);

      let errorMessage = 'Failed to create offer';

      if (error.code === 'ACTION_REJECTED') {
        errorMessage = 'Transaction rejected by user';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isEncrypting || isSubmitting;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Create Time Offer (FHE Encrypted)</h2>
        <p className="text-muted-foreground mt-2">
          â­ Your price, duration, and slots will be encrypted using FHEVM 0.9
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Title
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., 1 Hour Consultation"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your offer..."
            rows={4}
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Price (ETH) ð
            </label>
            <Input
              type="number"
              step="0.001"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.1"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Will be encrypted
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Duration (Days) ð
            </label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="30"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Will be encrypted
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Slots ð
            </label>
            <Input
              type="number"
              value={slots}
              onChange={(e) => setSlots(e.target.value)}
              placeholder="5"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Will be encrypted
            </p>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isEncrypting && 'ð Encrypting...'}
          {isSubmitting && !isEncrypting && 'ð¤ Creating Offer...'}
          {!isLoading && 'Create Encrypted Offer'}
        </Button>

        {isLoading && (
          <div className="text-center text-sm text-muted-foreground">
            {isEncrypting && 'â­ Step 1/2: Encrypting data with FHEVM 0.9...'}
            {isSubmitting && !isEncrypting && 'â­ Step 2/2: Submitting to blockchain...'}
          </div>
        )}
      </form>

      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <h3 className="font-semibold text-sm">ð FHEVM 0.9 Features:</h3>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>â Fully homomorphic encryption for sensitive data</li>
          <li>â Price, duration, and slots encrypted on-chain</li>
          <li>â Single shared proof for all encrypted values</li>
          <li>â Event-driven decryption when needed</li>
        </ul>
      </div>
    </div>
  );
}
