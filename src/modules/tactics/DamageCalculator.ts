export class DamageCalculator {
    /**
     * Calculates Time To Kill (TTK) in seconds.
     * Formula: (ShotsToKill - 1) * (60 / RPM)
     */
    static calculateTTK(damage: number, rpm: number, vestLevel: 2 | 3 = 2): string {
        if (!rpm || rpm === 0) return "N/A"; // Bolt-actions

        const vestMultiplier = vestLevel === 2 ? 0.6 : 0.45; // 40% reduction vs 55% reduction
        const damagePerShot = damage * vestMultiplier;
        
        const shotsToKill = Math.ceil(100 / damagePerShot);
        const timeBetweenShots = 60 / rpm;
        
        // First shot is instant (t=0), so we count (shots - 1) intervals
        const ttk = (shotsToKill - 1) * timeBetweenShots;
        
        return `${ttk.toFixed(3)}s (${shotsToKill} hits)`;
    }

    /**
     * Calculates Bullets to Kill based on body part.
     */
    static calculateBTK(damage: number, vestLevel: 2 | 3 = 2): number {
        const vestMultiplier = vestLevel === 2 ? 0.6 : 0.45;
        return Math.ceil(100 / (damage * vestMultiplier));
    }
}
