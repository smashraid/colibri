using Microsoft.Extensions.Logging;

namespace Colibri.Shared
{
    public static class Extensions
    {
        public static void LogWithContext(this ILogger logger, Action LogAction, params KeyValuePair<string, object>[] contextDataParam)
        {
            Dictionary<string, object> contextData = new();
            foreach (KeyValuePair<string, object> kvp in contextDataParam)
            {
                contextData.TryAdd(kvp.Key, kvp.Value);
            }

            using (logger.BeginScope(contextData))
            {
                LogAction.Invoke();
            }
            ;
        }
    }
}
