export interface ProcessorRequest {
    text: string;
    sessionId?: string;
    metadata: object;
}

export interface SoundSetLevelDirective {
    type: "soundSetLevel";
    newLevel: number;
}

export interface SoundQuieterDirective {
    type: "soundQuieter";
}

export interface SoundLouderDirective {
    type: "soundLouder";
}

export type AliceDirective = SoundSetLevelDirective | SoundQuieterDirective | SoundLouderDirective;

export interface ProcessorResult {
    text: string;
    requireMoreInput: boolean;
    sessionId: string;
    directives: AliceDirective[];
}