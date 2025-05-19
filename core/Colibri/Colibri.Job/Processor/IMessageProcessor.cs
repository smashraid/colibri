namespace Colibri.Job.Processor
{
    public interface IMessageProcessor<T>
    {
        Task ProcessMessageAsync(T message, CancellationToken cancellationToken);
    }
}
