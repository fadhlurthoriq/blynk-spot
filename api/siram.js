export default async function handler(req, res) {

    const token = process.env.BLYNK_TOKEN;

    if (!token) {
        return res.status(400).json({
            success: false,
            error: "BLYNK_TOKEN environment variable is not configured."
        });
    }

    if (!req.body) {
        return res.status(400).json({
            success: false,
            error: "Missing request body."
        });
    }

    const { state } = req.body;

    if (state === undefined) {
        return res.status(400).json({
            success: false,
            error: "Parameter 'state' is required in request body."
        });
    }

    try {
        const response = await fetch(
            `https://blynk.cloud/external/api/update?token=${token}&V4=${state}`
        );

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Blynk API returned status ${response.status}: ${errText}`);
        }

        res.status(200).json({
            success: true
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}