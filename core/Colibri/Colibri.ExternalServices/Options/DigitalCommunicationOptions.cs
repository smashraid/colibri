namespace Colibri.ExternalServices.Options
{
    public class DigitalCommunicationOptions
    {
        public const string Path = "DigitalCommunication";
        public string Url { get; set; } = string.Empty;
        public string TokenHeaderKey { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
    }
}
