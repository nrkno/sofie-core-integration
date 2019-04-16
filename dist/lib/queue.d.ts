export declare class Queue {
    private _isRunning;
    private _queue;
    putOnQueue<T>(fcn: () => Promise<T>): Promise<T>;
    private checkQueue;
}
