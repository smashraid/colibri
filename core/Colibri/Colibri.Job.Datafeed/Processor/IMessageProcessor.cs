using System;

namespace Colibri.Job.Datafeed.Processor;

public interface IMessageProcessor<T>
{
    Task ProcessMessageAsync(T message, CancellationToken cancellationToken);
}
