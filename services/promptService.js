// PromptService - Handles Chrome Built-in AI interactions
class PromptService {
    constructor(systemPrompt = "You are a helpful and friendly assistant.", responseSchema = {

    }) {
        this.session = null;
        this.system = systemPrompt;
        this.response = responseSchema
    }

    async ensure() {
        if (!this.session) {
            console.log('🔍 PromptService: Checking LanguageModel availability...');
            console.log('🔍 LanguageModel exists:', Boolean(self.LanguageModel));

            if (!self.LanguageModel) {
                const errorDetails = {
                    LanguageModel: Boolean(self.LanguageModel),
                    userAgent: navigator.userAgent,
                    location: window.location.href,
                    chromeVersion: navigator.userAgentData?.brands?.find(b => b.brand === 'Google Chrome')?.version
                };
                console.error('❌ PromptService: LanguageModel not available. Debug info:', errorDetails);
                throw new Error(`LanguageModel not available. Debug info: ${JSON.stringify(errorDetails)}`);
            }

            console.log('🔍 PromptService: Checking availability...');
            try {
                const availability = await LanguageModel.availability();
                console.log('📋 PromptService: LanguageModel availability:', availability);

                if (availability === 'unavailable') {
                    throw new Error(`Language model unavailable. Status: ${availability}`);
                }
            } catch (availError) {
                console.error('❌ PromptService: Availability check failed:', availError);
                throw new Error(`Language model availability check failed: ${availError.message}`);
            }

            console.log('🔍 PromptService: Creating session...');
            this.session = await LanguageModel.create({
                initialPrompts: [{ role: "system", content: this.system }],
                expectedInputs: [{ type: 'image' }]
            });
            console.log('✅ PromptService: Session created successfully');
        }
        return this.session;
    }

    async init(initialPrompt) {
        this.system = initialPrompt;
        this.session = null;
        await this.ensure();
    }

    /**
     * Sends input and images.
     * @param {str} input - User query
     * @param {List[image]} images - The list of images, default is null
     * @returns {output} Text output of returned by prompt api
     */
    async send(input, images = None) {
        const s = await this.ensure();
        const content = [{ type: "text", value: input }];
        for (const img of images) {
            content.push({ type: "image", value: img });
        }

        const res = await s.prompt([{ role: "user", content } ]);
        const out = res?.output ?? res?.output_text ?? "";
        return String(out).trim();
    }
}

if (typeof window !== 'undefined') {
    window.PromptService = PromptService;
    console.log('✅ Semantic routing classes exported to window');
    console.log('SemanticRouter type:', typeof window.SemanticRouter);
} else {
    console.error('❌ Window object not available - classes not exported');
}