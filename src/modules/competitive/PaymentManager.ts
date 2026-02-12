import axios from "axios";
import { db } from "../../core/DatabaseManager";
import { WalletManager, LedgerType } from "./WalletManager";

const OPENPIX_APP_ID = process.env.OPENPIX_APP_ID;
const OPENPIX_API_URL = "https://api.openpix.com.br/api/v1";

export class PaymentManager {
    /**
     * Create a Pix Charge (Deposito)
     */
    static async createDeposit(userId: string, amountCent: number) {
        if (!OPENPIX_APP_ID) throw new Error("OpenPix APP_ID not configured");

        const correlationID = `DEP-${userId}-${Date.now()}`;

        try {
            const response = await axios.post(
                `${OPENPIX_API_URL}/charge`,
                {
                    correlationID,
                    value: amountCent, // OpenPix uses cents
                    comment: "Deposito Competitivo BlueZone",
                },
                {
                    headers: {
                        Authorization: OPENPIX_APP_ID
                    }
                }
            );

            const charge = response.data.charge;

            // Save Transaction
            await db.write(async (prisma) => {
                await prisma.compTransaction.create({
                    data: {
                        userId,
                        type: "DEPOSIT",
                        amount: amountCent,
                        status: "PENDING",
                        externalId: correlationID,
                        qrCode: charge.brCode
                    }
                });
            });

            return {
                qrCode: charge.brCode,
                qrCodeImage: charge.qrCodeImage,
                expiresIn: charge.expiresIn
            };

        } catch (error) {
            console.error("OpenPix Error:", error);
            throw new Error("Falha ao gerar Pix. Tente novamente.");
        }
    }

    /**
     * Handle Webhook Event
     */
    static async handleWebhook(payload: any) {
        const { charge } = payload;
        if (!charge || charge.status !== "COMPLETED") return;

        const correlationID = charge.correlationID;
        
        // Find Transaction
        const tx = await db.read(async (prisma) => {
            return await prisma.compTransaction.findUnique({
                where: { externalId: correlationID }
            });
        });

        if (!tx || tx.status === "COMPLETED") return; // Idempotency check

        // Process Success
        await db.write(async (prisma) => {
            // 1. Mark Tx Completed
            await prisma.compTransaction.update({
                where: { id: tx.id },
                data: { status: "COMPLETED" }
            });
        });

        // 2. Add Balance
        if (tx.type === "DEPOSIT") {
            await WalletManager.addBalance(
                tx.userId,
                tx.amount,
                LedgerType.DEPOSIT,
                "Deposito via Pix"
            );
        }
        
        // Note: For direct Match Payment (not deposit), logic would be different.
        // Current plan: Deposit to Wallet -> Pay from Wallet. 
        // So this handles everything.
    }
}
