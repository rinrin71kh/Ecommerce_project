<template>
    <!-- <h1 class="text-center text-3xl">Make a payment</h1> -->
    <div>
        <!-- Popup overlay -->
        <div v-if="popup" class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
            <!-- Popup content -->
            <div class="bg-white rounded-lg shadow-lg max-w-5xl w-full  relative">
                <!-- Close button -->
                <!-- <button
                    class="absolute rounded-xl w-8 flex justify-center items-center h-8 bg-blue-600 top-3 right-3 text-white font-extrabold text-2xl hover:text-gray-700 focus:outline-none"
                    @click="togglePopup">
                    &times;
                </button> -->

                <!-- Customizable content area -->
                <div class="custom-content ">
                    <div class="flex justify-center items-center gap-12 m-12">
                        <div class="left flex flex-col gap-6">
                            <div v-if="!success" class="flex items-center justify-center gap-12">
                                <div class="flex flex-col gap-6">
                                    <h3 class="text-5xl font-">Payment amount</h3>
                                    <div class="flex gap-2 flex-col">
                                        <h1 class="text-4xl font-bold">${{ amountInKHR }}</h1>
                                        <button>Pay with Credit Card</button>
                                    </div>
                                    <h2>Checking Transaction Status...</h2>
                                    <p v-if="error">{{ error }}</p>
                                </div>
                                <div>
                                    <div class="qrcode-container shadow-xl rounded-xl pb-12">
                                        <svg width="400" height="170" xmlns="http://www.w3.org/2000/svg"
                                            class="rounded-md">
                                            <path d="M 0 0 H 400 Q 400 0 400 8 V 60 H 0 V 0 Z" fill="#F44336" />
                                            <text x="50%" y="30" font-size="24" fill="white" font-weight="bold"
                                                text-anchor="middle" alignment-baseline="middle">KHQR</text>
                                            <polygon points="400,60 400,100 350,60" fill="#F44336" />
                                            <!-- <rect x="0" y="60" width="400" height="190" fill="#E0E0E0" rx="8"/> -->
                                            <text x="40" y="100" font-size="15" fill="#212121" font-weight="600"
                                                text-anchor="start" alignment-baseline="middle">KHEANG OUY ORNG</text>
                                            <text x="40" y="140" font-size="36" fill="#212121" font-weight="bold"
                                                text-anchor="start" alignment-baseline="middle">$ {{ amountInKHR
                                                }}</text>
                                        </svg>

                                        <canvas id="qrcode"></canvas>
                                    </div>
                                </div>
                            </div>
                            <div v-else>
                                <!-- <h1>Transaction Successful!</h1>
                                <p>Transaction Details:</p> -->
                                <pre
                                    class="text-green-500 font-bold text-2xl">Successfully Received ${{ response.data.amount }}</pre>
                                <h4 class="text-xl font-bold">Thank you for your purchase.</h4>
                            </div>

                        </div>
                    </div>
                </div>

                <!-- Footer actions -->
            </div>
        </div>
    </div>

    <!-- Ref: https://bakong.nbc.gov.kh/download/KHQR/integration/Bakong%20Open%20API%20Document.pdf -->
</template>
<script>
import { KHQR, CURRENCY, COUNTRY, TAG } from "ts-khqr";
import QRCode from "qrcode";
import axios from "axios";
import { ChangeBoughtStatus } from "@/api/Cart/ChangeStatus";
import { sharedState } from "@/stores/cartStore";
import router from "@/router";

export default {
    data() {
        return {
            md5: "",
            response: null,
            error: null,
            success: false,
            popup: true,
        };
    },
    props: {
        amountInKHR: {
            required: true,
        },
        itemsID: {
            type: String[''],
            required: true,
        },
        QRpayComponent: {
            type: String,
            required: true,
        }
    },
    methods: {
        async generateQRCode() {
            const canvas = document.getElementById("qrcode");
            const result = KHQR.generate({
                tag: TAG.INDIVIDUAL,
                accountID: "khem_soksombath@trmc",
                merchantName: "TEAMB1-GIC25",
                merchantID: "012345678",
                acquiringBank: "Dev Bank",
                merchantCity: "Phnom Penh",
                currency: CURRENCY.KHR,
                amount: this.amountInKHR,
                countryCode: COUNTRY.KH,
                additionalData: {
                    mobileNumber: "85512345678",
                    billNumber: "INV-2022-12-25",
                    storeLabel: "Ishin Shop",
                    terminalLabel: "012345",
                    purposeOfTransaction: "Payment",
                },
                languageData: {
                    languagePreference: "ZH",
                    merchantNameAlternateLanguage: "文山",
                    merchantCityAlternateLanguage: "金边",
                },
                upiMerchantAccount: "",
            });

            QRCode.toCanvas(canvas, result.data.qr, (error) => {
                if (error) {
                    console.error("Error generating QR code:", error);
                }
            });

            this.md5 = result.data.md5;

            this.checkTransactionStatus();

        },
        async checkTransactionStatus() {
            const url = "https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5";
            const accessToken =
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoiNDU3MzJlMzhiN2E3NDM3NiJ9LCJpYXQiOjE3MzM0NTU4NjEsImV4cCI6MTc0MTIzMTg2MX0.VF3vKIm0eSVvT9VqiUXMy7rPPqO-bzin8wcKlwNUR2g";

            try {
                const res = await axios.post(
                    url,
                    { md5: this.md5 },
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            "Content-Type": "application/json",
                        },
                    }
                );

                // Check if the transaction is successful
                if (res.data.responseMessage === "Success") {
                    this.success = true;
                    this.response = res.data;
                    this.itemsID.map((item) => ChangeBoughtStatus(item))
                    setTimeout(() => sharedState.QRpayComponent = null,
                        3000)
                    setTimeout(() => router.push("/"),
                        3000)
                } else {
                    // If not successful, retry after a delay
                    setTimeout(this.checkTransactionStatus, 5000); // Retry every 5 seconds
                }
            } catch (err) {
                this.error = err.response ? err.response.data : err.message;
                setTimeout(this.checkTransactionStatus, 5000);
            }
        },

        togglePopup() {
            this.popup = !this.popup;
        },
    },
    mounted() {
        console.log("this" + this.itemsID)
        this.generateQRCode();

    },
};
</script>

<style scoped>
.qrcode-container {
    text-align: center;
    margin-bottom: 20px;
}

canvas {
    display: block;
    margin: 0 auto;
}

h2 {
    color: #007bff;
}

p {
    color: #dc3545;
}
</style>