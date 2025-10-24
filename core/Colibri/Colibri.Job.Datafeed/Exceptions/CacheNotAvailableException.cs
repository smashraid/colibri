using System;

namespace Colibri.Job.Datafeed.Exceptions;

public class CacheNotAvailableException(string message) : Exception(message)
{
}
