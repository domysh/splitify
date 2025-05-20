FROM debian:bookworm
RUN apt update && apt install -y texlive texlive-lang-italian texlive-latex-extra texlive-pictures texlive-fonts-extra
RUN apt install -y python3-pygments default-jdk curl graphviz
RUN curl -L -o /plantuml.jar https://github.com/plantuml/plantuml/releases/download/v1.2025.2/plantuml-1.2025.2.jar

WORKDIR /workspace
