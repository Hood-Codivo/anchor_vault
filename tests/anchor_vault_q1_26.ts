import { AnchorVaultQ126 } from "../target/types/anchor_vault_q1_26";

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.AnchorVaultQ126 as Program<AnchorVaultQ126>;

const user = provider.wallet.publicKey;

const [vaultStatePda, stateBump] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("state"), user.toBuffer()],
  program.programId,
);

const [vaultPda, vaultBump] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), vaultStatePda.toBuffer()],
  program.programId,
);

console.log("Vault State PDA:", vaultStatePda.toBase58());
console.log("Vault PDA:", vaultPda.toBase58());

before(async () => {
  await provider.connection.requestAirdrop(
    user,
    10 * anchor.web3.LAMPORTS_PER_SOL,
  );
  await new Promise((r) => setTimeout(r, 1000));
});

it("Initialize the vault", async () => {
  await program.methods
    .initialize()
    .accountsStrict({
      user: user,
      vaultState: vaultStatePda,
      vault: vaultPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  const vaultBalance = await provider.connection.getBalance(vaultPda);
  const rentExempt =
    await provider.connection.getMinimumBalanceForRentExemption(0);
  expect(vaultBalance).to.equal(rentExempt);
  console.log("Vault Balance after initialization:", vaultBalance);
});

// Vault State PDA: J78kQeFGWQ5dNSmfqwgYuJKCVHJQZxPMx3kVxxfeJ1Jv
// Vault PDA: Ebg2jPEhyZji37xHeUcJW6tvko5DW155QJsvcJ2Nty9k

it("Deposit SOL into the vault", async () => {
  const amount = 1 * anchor.web3.LAMPORTS_PER_SOL;

  await program.methods
    .deposit(new anchor.BN(amount))
    .accountsStrict({
      user: user,
      vault: vaultPda,
      vaultState: vaultStatePda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  const balance = await provider.connection.getBalance(vaultPda);

  console.log("Vault balance after deposit:", balance);
});

it("Withdraw SOL from the vault", async () => {
  const amount = 0.5 * anchor.web3.LAMPORTS_PER_SOL;

  await program.methods
    .withdraw(new anchor.BN(amount))
    .accountsStrict({
      user: user,
      vault: vaultPda,
      vaultState: vaultStatePda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  const balance = await provider.connection.getBalance(vaultPda);

  console.log("Vault balance after withdraw:", balance);
});

it("Close the vault", async () => {
  await program.methods
    .close()
    .accountsStrict({
      user: user,
      vault: vaultPda,
      vaultState: vaultStatePda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  const info = await provider.connection.getAccountInfo(vaultStatePda);

  console.log("Vault state after close:", info);
});
